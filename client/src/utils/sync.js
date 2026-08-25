import axios from 'axios';
import { personsRepo, tagsRepo, relationshipsRepo, interactionsRepo, syncQueue, metadata } from '../db';

// 网络状态监听
class NetworkMonitor {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = [];
    
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notify('online');
      SyncEngine.getInstance().onNetworkRecovered();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notify('offline');
    });
  }
  
  onChange(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }
  
  notify(type) {
    this.listeners.forEach(cb => cb(type, this.isOnline));
  }
}

// 同步引擎（单例）
class SyncEngine {
  static instance = null;
  static getInstance() {
    if (!SyncEngine.instance) {
      SyncEngine.instance = new SyncEngine();
    }
    return SyncEngine.instance;
  }
  
  constructor() {
    this.monitor = new NetworkMonitor();
    this.isSyncing = false;
    this.lastSyncTime = null;
  }
  
  // 网络恢复后触发
  async onNetworkRecovered() {
    console.log('[Sync] 网络恢复，开始同步...');
    
    try {
      // 1. 先同步本地的待处理操作
      await this.syncPendingOperations();
      
      // 2. 再从服务端拉取最新数据
      await this.pullLatestData();
      
      this.lastSyncTime = Date.now();
      await metadata.set('lastSyncTime', this.lastSyncTime);
      
      console.log('[Sync] 同步完成');
      this.notify('synced', { time: this.lastSyncTime });
    } catch (e) {
      console.error('[Sync] 同步失败:', e);
      this.notify('error', { error: e.message });
    }
  }
  
  // 同步待处理操作队列
  async syncPendingOperations() {
    const pendingOps = await syncQueue.getPending();
    
    if (pendingOps.length === 0) {
      console.log('[Sync] 无待同步操作');
      return;
    }
    
    console.log(`[Sync] 发现 ${pendingOps.length} 个待同步操作`);
    
    // 按创建时间排序（先处理早期的）
    const sortedOps = pendingOps.sort((a, b) => a.created_at - b.created_at);
    
    for (const op of sortedOps) {
      try {
        await this.executeRemoteOperation(op);
        await syncQueue.markSynced(op.id);
      } catch (e) {
        console.error(`[Sync] 操作失败 [${op.entity_type} ${op.operation}]:`, e.message);
        await syncQueue.markFailed(op.id, e.message);
      }
    }
  }
  
  // 执行远程操作
  async executeRemoteOperation(op) {
    const url = `/api/${op.entity_type}`;
    let config = { headers: this.getAuthHeaders() };
    
    switch (op.operation) {
      case 'create':
        await axios.post(url, op.payload, config);
        break;
      case 'update':
        await axios.put(`${url}/${op.entity_id}`, op.payload, config);
        break;
      case 'delete':
        await axios.delete(`${url}/${op.entity_id}`, config);
        break;
      default:
        throw new Error(`未知操作类型: ${op.operation}`);
    }
  }
  
  // 从服务端拉取最新数据
  async pullLatestData() {
    try {
      const config = { headers: this.getAuthHeaders() };
      
      // 并行拉取所有实体数据
      const [personsRes, tagsRes] = await Promise.all([
        axios.get('/api/persons?page=1&pageSize=1000', config),
        axios.get('/api/tags', config).catch(() => ({ data: [] }))
      ]);
      
      // 拉取所有互动记录
      const interactionsRes = await axios.get('/api/interactions', config).catch(() => ({ data: [] }));
      
      // 合并数据（最后写入优先）
      await this.mergeRemoteData({
        persons: personsRes?.data || personsRes,
        tags: tagsRes?.data || [],
        interactions: Array.isArray(interactionsRes?.data) ? interactionsRes.data : (interactionsRes?.data?.list || [])
      });
      
      // 清理已同步的操作记录
      await syncQueue.removeSynced();
      
      console.log('[Sync] 数据拉取完成');
    } catch (e) {
      console.error('[Sync] 拉取数据失败:', e);
      // 即使部分接口失败也不中断，尽力同步
    }
  }
  
  // 合并远程数据到本地
  async mergeRemoteData(remoteData) {
    // Persons - 格式: { total, page, pageSize, list: [...] }
    if (remoteData.persons) {
      const personsList = remoteData.persons.list || (Array.isArray(remoteData.persons) ? remoteData.persons : []);
      if (personsList.length > 0) {
        // 转换数据格式，确保有必要的字段
        const normalizedPersons = personsList.map(p => ({
          id: p.id,
          name: p.name,
          organization: p.organization || p.company || '',
          position: p.position || '',
          phone: p.phone || '',
          email: p.email || '',
          intimacy: p.intimacy || 0,
          city: p.city || '',
          last_interaction_at: p.last_interacted_at || null,
          updated_at: p.updated_at || p.created_at || new Date().toISOString(),
          created_at: p.created_at || new Date().toISOString()
        }));
        await personsRepo.bulkPut(normalizedPersons);
      }
    }
    
    // Tags - 格式: 数组
    if (Array.isArray(remoteData.tags) && remoteData.tags.length > 0) {
      const normalizedTags = remoteData.tags.map(t => ({
        id: t.id,
        name: t.name,
        color: t.color || '#8c8c8c',
        sort_order: t.sort_order || 0
      }));
      await tagsRepo.bulkPut(normalizedTags);
    }
    
    // Interactions - 格式: 数组
    if (Array.isArray(remoteData.interactions) && remoteData.interactions.length > 0) {
      const normalizedInteractions = remoteData.interactions.map(i => ({
        id: i.id,
        person_id: i.person_id,
        interaction_date: i.interaction_date,
        method: i.method || '',
        content: i.content || '',
        updated_at: i.updated_at || i.created_at || new Date().toISOString(),
        created_at: i.created_at || new Date().toISOString()
      }));
      await interactionsRepo.bulkPut(normalizedInteractions);
    }
  }
  
  // 获取认证头
  getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  
  // 离线操作：先存本地，再加入同步队列
  async offlineOperation(entityType, operation, payload) {
    // 1. 存到本地数据库
    let localId = payload.id;
    
    switch (entityType) {
      case 'persons':
        if (operation === 'create') {
          const result = await personsRepo.create(payload);
          localId = result.id;
        } else if (operation === 'update') {
          await personsRepo.update(payload.id, payload);
        } else if (operation === 'delete') {
          await personsRepo.delete(payload.id);
        }
        break;
        
      case 'interactions':
        if (operation === 'create') {
          const result = await interactionsRepo.create(payload);
          localId = result.id;
        }
        break;
    }
    
    // 2. 加入同步队列
    const syncId = await syncQueue.add({
      entity_type: entityType,
      entity_id: localId || payload.id,
      operation,
      payload: { ...payload, id: localId || payload.id }
    });
    
    console.log(`[Sync] 离线操作已记录: ${entityType} ${operation} (syncId=${syncId})`);
    
    return { id: localId, synced: false };
  }
  
  // 监听状态变化
  onSyncStateChange(callback) {
    return this.monitor.onChange(callback);
  }
  
  // 手动触发同步
  async manualSync() {
    if (!this.monitor.isOnline) {
      throw new Error('当前处于离线状态，无法同步');
    }
    await this.onNetworkRecovered();
  }
  
  // 通知状态变化
  notify(type, data) {
    this.monitor.notify(type);
    if (type === 'synced') {
      localStorage.setItem('lastSyncTime', data.time);
    }
  }
  
  // 获取状态
  async getStatus() {
    const pendingCount = await syncQueue.pendingCount();
    return {
      isOnline: this.monitor.isOnline,
      pendingCount,
      lastSyncTime: this.lastSyncTime,
      userId: localStorage.getItem('auth_user_id')
    };
  }
}

export const syncEngine = SyncEngine.getInstance();
export const networkMonitor = syncEngine.monitor;
