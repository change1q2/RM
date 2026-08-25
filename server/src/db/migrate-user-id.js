// 迁移脚本：给已存在的表添加 user_id 列
// 适用于已有数据的数据库升级
const { query, queryOne, run, execScript, getRawDb } = require('./index');

(async () => {
  console.log('=== 开始 user_id 迁移 ===\n');

  // 需要加 user_id 的表
  const tablesToMigrate = ['persons', 'interactions', 'relationships', 'opportunities'];

  for (const table of tablesToMigrate) {
    // 检查表是否存在
    const tableExists = await queryOne(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [table]
    );
    if (!tableExists) {
      console.log(`[跳过] 表 ${table} 不存在`);
      continue;
    }

    // 检查是否已有 user_id 列
    const columns = await query(`PRAGMA table_info(${table})`);
    const hasUserId = columns.some(c => c.name === 'user_id');

    if (hasUserId) {
      console.log(`[跳过] ${table} 已有 user_id 列`);
      continue;
    }

    // 添加 user_id 列，默认值为 1（admin）
    try {
      await execScript(`ALTER TABLE ${table} ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE`);
      console.log(`[成功] ${table} 已添加 user_id 列 (DEFAULT 1)`);
    } catch (e) {
      // SQLite 不支持 ALTER TABLE ADD COLUMN 带 REFERENCES，退化为简单列
      try {
        await execScript(`ALTER TABLE ${table} ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1`);
        console.log(`[成功] ${table} 已添加 user_id 列 (DEFAULT 1, 无外键约束)`);
      } catch (e2) {
        console.error(`[失败] ${table}: ${e2.message}`);
      }
    }
  }

  // 确保至少有一个 admin 用户 (id=1)
  const admin = await queryOne('SELECT id FROM users WHERE id = 1');
  if (!admin) {
    console.log('\n[警告] 未找到 id=1 的用户，现有数据可能无法正确关联');
  } else {
    console.log(`\n[确认] admin 用户存在 (id=1)`);
  }

  console.log('\n=== user_id 迁移完成 ===');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
