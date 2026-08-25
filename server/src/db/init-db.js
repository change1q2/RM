const { query, queryOne, run, execScript, getRawDb } = require('./index');
const { schemaTables } = require('./schema');
const { DEFAULT_TAGS, DEFAULT_CONFIG } = require('./default-data');

// 需要加 user_id 的表
const TABLES_WITH_USER_ID = ['persons', 'interactions', 'relationships', 'opportunities'];

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

  // 自动迁移：给已有表加 user_id 列
  console.log('\n=== 检查 user_id 迁移 ===');
  for (const table of TABLES_WITH_USER_ID) {
    const tableExists = await queryOne(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table]);
    if (!tableExists) continue;

    const columns = await query(`PRAGMA table_info(${table})`);
    const hasUserId = columns.some(c => c.name === 'user_id');

    if (hasUserId) {
      console.log(`[跳过] ${table} 已有 user_id 列`);
      continue;
    }

    try {
      await run(`ALTER TABLE ${table} ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1`);
      console.log(`[成功] ${table} 已添加 user_id 列`);
    } catch (e) {
      console.error(`[失败] ${table} 添加 user_id: ${e.message}`);
    }
  }

  // 确保 persons 和 interactions 的 created_at / updated_at 列存在
  console.log('\n=== 检查时间戳列 ===');
  for (const table of ['persons', 'interactions']) {
    const columns = await query(`PRAGMA table_info(${table})`);
    const colNames = columns.map(c => c.name);
    if (!colNames.includes('created_at')) {
      try { await run(`ALTER TABLE ${table} ADD COLUMN created_at DATETIME`); console.log(`[成功] ${table} 已添加 created_at 列`); }
      catch (e) { console.error(`[失败] ${table} created_at: ${e.message}`); }
    }
    if (!colNames.includes('updated_at')) {
      try { await run(`ALTER TABLE ${table} ADD COLUMN updated_at DATETIME`); console.log(`[成功] ${table} 已添加 updated_at 列`); }
      catch (e) { console.error(`[失败] ${table} updated_at: ${e.message}`); }
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
