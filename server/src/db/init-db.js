const { query, queryOne, run, execScript, getRawDb } = require('./index');
const { schemaTables } = require('./schema');
const { DEFAULT_TAGS, DEFAULT_CONFIG } = require('./default-data');

(async () => {
  const rawDb = getRawDb();
  if (rawDb) {
    rawDb.pragma('foreign_keys = ON');
    rawDb.pragma('journal_mode = WAL');
  }

  console.log('=== 开始初始化数据库 ===\n');

  for (const [tableName, sql] of Object.entries(schemaTables)) {
    const before = await queryOne(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName]);
    await execScript(sql);
    if (before) {
      console.log('[表] ' + tableName + ': 已存在');
    } else {
      console.log('[表] ' + tableName + ': 创建完成');
    }
  }

  console.log('\n=== 插入默认标签 ===');
  for (const tag of DEFAULT_TAGS) {
    const existing = await queryOne('SELECT id FROM tags WHERE name = ?', [tag.name]);
    if (existing) {
      console.log('[标签] ' + tag.name + ': 已存在');
      continue;
    }
    const r = await run('INSERT INTO tags (name, color, sort_order) VALUES (?, ?, ?)', [tag.name, tag.color, tag.sort_order]);
    if (r.changes > 0) console.log('[标签] ' + tag.name + ': 插入成功');
  }

  console.log('\n=== 插入默认配置 ===');
  for (const cfg of DEFAULT_CONFIG) {
    const existing = await queryOne('SELECT id FROM config WHERE key = ?', [cfg.key]);
    if (existing) {
      console.log('[配置] ' + cfg.key + ': 已存在');
      continue;
    }
    const r = await run('INSERT INTO config (key, value) VALUES (?, ?)', [cfg.key, cfg.value]);
    if (r.changes > 0) console.log('[配置] ' + cfg.key + '=' + cfg.value + ': 插入成功');
  }

  console.log('\n=== 数据库初始化完成 ===');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
