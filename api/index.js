// Vercel Serverless 单函数入口
let app;
let dbInitPromise = null;

async function ensureDbInit() {
  if (dbInitPromise) return dbInitPromise;
  dbInitPromise = (async () => {
    const { queryOne, query, run } = require('../server/src/db');
    try {
      await queryOne('SELECT 1');
      console.log('[init] 数据库连接正常');
    } catch (e) {
      console.error('[init] 数据库连接失败:', e.message);
      throw e;
    }

    // 自动迁移 user_id
    const tables = ['persons', 'interactions', 'relationships', 'opportunities'];
    for (const t of tables) {
      try {
        const exists = await queryOne(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [t]);
        if (!exists) continue;
        const cols = await query(`PRAGMA table_info(${t})`);
        const has = cols.some(c => c.name === 'user_id');
        if (!has) {
          await run(`ALTER TABLE ${t} ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1`);
          console.log(`[init] ${t} 已添加 user_id 列`);
        }
      } catch (e) {
        console.error(`[init] ${t} 迁移失败:`, e.message);
      }
    }
    console.log('[init] 数据库初始化完成');
  })();
  return dbInitPromise;
}

module.exports = async (req, res) => {
  try {
    await ensureDbInit();
  } catch (e) {
    console.error('[init] 初始化失败:', e.message);
    res.status(500).json({ error: '数据库初始化失败' });
    return;
  }
  if (!app) {
    app = require('../server/src/index');
  }
  const original = req.headers['x-now-original-url'] || req.headers['x-vercel-original-url'] || req.url;
  if (original && !req.url.startsWith(original)) {
    req.url = original;
  }
  app(req, res);
};
