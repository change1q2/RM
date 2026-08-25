import Dexie from 'dexie';

// 离线本地数据库
const db = new Dexie('rm-offline');

// 定义 Schema
// v1: 初始版本
// v2: 增加完整字段支持
db.version(2).stores({
  // 实体数据（镜像服务端）
  persons: '++id, name, organization, position, phone, email, city, intimacy, last_interaction_at, updated_at, created_at',
  tags: '++id, name, color, sort_order',
  relationships: '++id, person_a_id, person_b_id, type, updated_at',
  interactions: '++id, person_id, interaction_date, method, content, updated_at, created_at',
  
  // 同步操作队列
  sync_operations: '++id, entity_type, entity_id, operation, status, created_at',
  // operation: 'create' | 'update' | 'delete'
  // status: 'pending' | 'synced' | 'failed'
  
  // 元数据
  metadata: 'key',
});

// v1->v2 迁移（保留旧数据）
db.version(1).stores({
  persons: '++id, name, organization, intimacy, last_interaction_at, updated_at',
  tags: '++id, name, sort_order',
  relationships: '++id, person_a_id, person_b_id, type, updated_at',
  interactions: '++id, person_id, interaction_date, method, updated_at',
  sync_operations: '++id, entity_type, entity_id, operation, status, created_at',
  metadata: 'key',
});

// 定义 Schema

// ======== 实体数据 CRUD ========

// Persons
export const personsRepo = {
  async list(params = {}) {
    let collection = db.persons;
    
    if (params.keyword) {
      collection = collection.filter(p => 
        p.name.includes(params.keyword) || 
        (p.organization && p.organization.includes(params.keyword))
      );
    }
    
    if (params.minIntimacy) {
      collection = collection.filter(p => p.intimacy >= params.minIntimacy);
    }
    
    const all = await collection.toArray();
    const total = all.length;
    
    // 排序
    if (params.sortBy === 'intimacy') {
      all.sort((a, b) => (b.intimacy || 0) - (a.intimacy || 0));
    } else if (params.sortBy === 'last_interaction') {
      all.sort((a, b) => new Date(b.last_interaction_at || 0) - new Date(a.last_interaction_at || 0));
    } else {
      all.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }
    
    // 分页
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const list = all.slice((page - 1) * pageSize, page * pageSize);
    
    return { total, page, pageSize, list };
  },
  
  async getById(id) {
    return await db.persons.get(id);
  },
  
  async create(data) {
    const id = await db.persons.add({
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    return await db.persons.get(id);
  },
  
  async update(id, data) {
    await db.persons.update(id, {
      ...data,
      updated_at: new Date().toISOString()
    });
    return await db.persons.get(id);
  },
  
  async delete(id) {
    await db.persons.delete(id);
  },
  
  async bulkPut(items) {
    await db.persons.bulkPut(items);
  },
  
  async count() {
    return await db.persons.count();
  }
};

// Tags
export const tagsRepo = {
  async list() {
    return await db.tags.orderBy('sort_order').toArray();
  },
  
  async bulkPut(items) {
    await db.tags.bulkPut(items);
  }
};

// Relationships
export const relationshipsRepo = {
  async listByPerson(personId) {
    return await db.relationships
      .filter(r => r.person_a_id === personId || r.person_b_id === personId)
      .toArray();
  },
  
  async bulkPut(items) {
    await db.relationships.bulkPut(items);
  },
  
  async deleteByPerson(personId) {
    await db.relationships
      .filter(r => r.person_a_id === personId || r.person_b_id === personId)
      .delete();
  }
};

// Interactions
export const interactionsRepo = {
  async listByPerson(personId) {
    return await db.interactions
      .filter(i => i.person_id === personId)
      .orderBy('interaction_date')
      .reverse()
      .toArray();
  },
  
  async create(data) {
    const id = await db.interactions.add({
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    return await db.interactions.get(id);
  },
  
  async bulkPut(items) {
    await db.interactions.bulkPut(items);
  },
  
  async deleteByPerson(personId) {
    await db.interactions.filter(i => i.person_id === personId).delete();
  }
};

// ======== 同步操作队列 ========

export const syncQueue = {
  async add(operation) {
    return await db.sync_operations.add({
      ...operation,
      status: 'pending',
      created_at: Date.now()
    });
  },
  
  async getPending() {
    return await db.sync_operations
      .filter(o => o.status === 'pending')
      .orderBy('created_at')
      .toArray();
  },
  
  async markSynced(id) {
    await db.sync_operations.update(id, { status: 'synced' });
  },
  
  async markFailed(id, error) {
    await db.sync_operations.update(id, { status: 'failed', error });
  },
  
  async removeSynced() {
    await db.sync_operations.filter(o => o.status === 'synced').delete();
  },
  
  async pendingCount() {
    return await db.sync_operations.filter(o => o.status === 'pending').count();
  }
};

// ======== 元数据 ========

export const metadata = {
  async get(key) {
    const record = await db.metadata.get(key);
    return record?.value;
  },
  
  async set(key, value) {
    await db.metadata.put({ key, value });
  }
};

export default db;
