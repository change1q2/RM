import axios from 'axios';
import { message } from 'antd';
import { useAuthStore } from '../store/auth';
import { syncEngine, networkMonitor } from './sync';
import { personsRepo, tagsRepo, interactionsRepo, relationshipsRepo } from '../db';

const instance = axios.create({
  baseURL: '/api',
  timeout: 30000
});

// ======== 离线请求处理 ========

// URL 解析：从 /api/persons/123 提取实体类型和 ID
function parseUrl(url) {
  const path = url.replace(/^\/api\//, '');
  const parts = path.split('/').filter(Boolean);
  return {
    entityType: parts[0],  // persons, tags, interactions 等
    id: parts[1] ? parseInt(parts[1]) : null,
    action: parts[2] || null
  };
}

// 离线 GET 请求处理
async function handleOfflineGet(config) {
  const { entityType, id } = parseUrl(config.url);
  const params = config.params || {};
  
  switch (entityType) {
    case 'persons':
      if (id) {
        const person = await personsRepo.getById(id);
        if (!person) throw { response: { status: 404, data: { error: '人物不存在' } } };
        return { data: person, status: 200, offline: true };
      }
      const list = await personsRepo.list({
        page: params.page,
        pageSize: params.pageSize,
        keyword: params.keyword,
        minIntimacy: params.minIntimacy,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder
      });
      return { data: list, status: 200, offline: true };
      
    case 'tags':
      const tags = await tagsRepo.list();
      return { data: tags, status: 200, offline: true };
      
    case 'interactions':
      if (id) {
        const list = await interactionsRepo.listByPerson(id);
        return { data: list, status: 200, offline: true };
      }
      return { data: [], status: 200, offline: true };
      
    case 'relationships':
      if (id) {
        const rels = await relationshipsRepo.listByPerson(id);
        return { data: rels, status: 200, offline: true };
      }
      return { data: [], status: 200, offline: true };
      
    case 'health':
      return { data: { ok: true, offline: true }, status: 200, offline: true };
      
    default:
      throw { response: { status: 404, data: { error: `离线模式不支持 ${entityType}` } } };
  }
}

// 离线 POST/PUT/DELETE 请求处理
async function handleOfflineMutation(config) {
  const { entityType, id } = parseUrl(config.url);
  const data = config.data;
  const method = config.method.toUpperCase();
  
  let operation, result;
  
  if (method === 'POST') {
    operation = 'create';
    result = await syncEngine.offlineOperation(entityType, operation, data);
  } else if (method === 'PUT') {
    operation = 'update';
    result = await syncEngine.offlineOperation(entityType, operation, { ...data, id });
  } else if (method === 'DELETE') {
    operation = 'delete';
    result = await syncEngine.offlineOperation(entityType, operation, { id });
  }
  
  return { 
    data: { id: result.id, ...data, synced: false }, 
    status: method === 'POST' ? 201 : 200, 
    offline: true 
  };
}

// 离线请求总入口
async function handleOfflineRequest(config) {
  const method = config.method.toUpperCase();
  
  // GET → 查询
  if (method === 'GET') {
    return handleOfflineGet(config);
  }
  
  // POST/PUT/DELETE → 修改
  if (['POST', 'PUT', 'DELETE'].includes(method)) {
    return handleOfflineMutation(config);
  }
  
  // 其他方法不支持
  throw { response: { status: 405, data: { error: `离线模式不支持 ${method} 方法` } } };
}

// ======== 请求拦截器 ========

instance.interceptors.request.use(async (config) => {
  // 添加认证 token
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = 'Bearer ' + token;
  }
  
  // 离线模式：拦截请求，走本地处理
  if (!networkMonitor.isOnline) {
    try {
      const offlineResponse = await handleOfflineRequest(config);
      // 返回一个模拟的响应对象，跳过实际的 HTTP 请求
      config.adapter = async () => offlineResponse;
    } catch (e) {
      // 离线处理失败，让错误走正常的响应拦截器
      config.adapter = async () => { throw e; };
    }
  }
  
  return config;
});

// ======== 响应拦截器 ========

instance.interceptors.response.use(
  (res) => {
    // 离线响应标记
    if (res.config?.offline || res.data?.offline) {
      console.log('[Offline] 数据来自本地缓存');
      const { offline, ...data } = res.data;
      return data;
    }
    return res.data;
  },
  (err) => {
    // 离线错误处理
    if (err.response?.data?.offline === false) {
      // 离线操作的错误
      message.warning('离线操作已保存，网络恢复后将自动同步');
      return Promise.reject(err);
    }
    
    if (err.response && err.response.status === 401) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (err.response && err.response.data && err.response.data.error) {
      message.error(err.response.data.error);
    } else if (!networkMonitor.isOnline) {
      message.warning('当前处于离线模式，已切换到本地数据');
    } else {
      message.error('网络错误，请稍后重试');
    }
    return Promise.reject(err);
  }
);

export default instance;

// 扩展方法：获取离线状态
instance.getOfflineStatus = () => ({
  isOnline: networkMonitor.isOnline,
  pendingCount: syncEngine.getStatus().then(s => s.pendingCount)
});

// 扩展方法：手动同步
instance.manualSync = () => syncEngine.manualSync();
