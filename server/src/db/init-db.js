const { db } = require('./index');
const { schemaTables } = require('./schema');
const { DEFAULT_TAGS, DEFAULT_CONFIG } = require('./default-data');

db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

console.log('=== 开始初始化数据库 ===\n');

for (const [tableName, sql] of Object.entries(schemaTables)) {
  const before = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(tableName);
  db.exec(sql);
  if (before) {
    console.log(`[表] ${tableName}: 已存在`);
  } else {
    console.log(`[表] ${tableName}: 创建完成`);
  }
}

console.log('\n=== 插入默认标签 ===');
const insertTag = db.prepare(`INSERT OR IGNORE INTO tags (name, color, sort_order) VALUES (?, ?, ?)`);
for (const tag of DEFAULT_TAGS) {
  const result = insertTag.run(tag.name, tag.color, tag.sort_order);
  if (result.changes > 0) {
    console.log(`[标签] ${tag.name}: 插入成功`);
  } else {
    console.log(`[标签] ${tag.name}: 已存在`);
  }
}

console.log('\n=== 插入默认配置 ===');
const insertConfig = db.prepare(`INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)`);
for (const cfg of DEFAULT_CONFIG) {
  const result = insertConfig.run(cfg.key, cfg.value);
  if (result.changes > 0) {
    console.log(`[配置] ${cfg.key}=${cfg.value}: 插入成功`);
  } else {
    console.log(`[配置] ${cfg.key}: 已存在`);
  }
}

console.log('\n=== 数据库初始化完成 ===');
