const schemaTables = {
  users: `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  persons: `CREATE TABLE IF NOT EXISTS persons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    wechat TEXT,
    email TEXT,
    birthday TEXT,
    city TEXT,
    company TEXT,
    position TEXT,
    intimacy INTEGER DEFAULT 3,
    resource_desc TEXT,
    need_desc TEXT,
    private_note TEXT,
    avatar_url TEXT,
    last_interacted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  tags: `CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    color TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    category TEXT DEFAULT 'default',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  person_tags: `CREATE TABLE IF NOT EXISTS person_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(person_id, tag_id)
  )`,

  relationships: `CREATE TABLE IF NOT EXISTS relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
    person_a_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    person_b_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL,
    strength INTEGER DEFAULT 3,
    introduced_by INTEGER REFERENCES persons(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(person_a_id, person_b_id, relation_type)
  )`,

  interactions: `CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
    person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    interaction_date DATE NOT NULL,
    method TEXT NOT NULL,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  interaction_todos: `CREATE TABLE IF NOT EXISTS interaction_todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    interaction_id INTEGER NOT NULL REFERENCES interactions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_completed INTEGER DEFAULT 0,
    completed_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  opportunities: `CREATE TABLE IF NOT EXISTS opportunities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    person_id INTEGER REFERENCES persons(id) ON DELETE SET NULL,
    company TEXT,
    stage TEXT DEFAULT '初谈',
    estimated_amount REAL DEFAULT 0,
    estimated_sign_date DATE,
    remark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  config: `CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
};

module.exports = { schemaTables };
