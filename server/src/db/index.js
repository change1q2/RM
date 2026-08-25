const path = require('path');
const fs = require('fs');
require('dotenv').config();

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
const USE_TURSO = !!(TURSO_URL && TURSO_TOKEN);

let sqlite = null;
let tursoClient = null;

if (USE_TURSO) {
  const { createClient } = require('@libsql/client');
  tursoClient = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  console.log('[db] 使用 Turso 数据库: ' + TURSO_URL);
} else {
  const Database = require('better-sqlite3');
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../../../data/app.db');
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  console.log('[db] 使用本地 SQLite: ' + dbPath);
}

function normalizeParams(params) {
  if (params == null) return [];
  if (Array.isArray(params)) return params;
  if (typeof params === 'object') {
    const arr = [];
    Object.keys(params).forEach(k => arr[parseInt(k)] = params[k]);
    return arr;
  }
  return [params];
}

function toArray(params) {
  const p = normalizeParams(params);
  if (p.length === 0) return [];
  // better-sqlite3 也接受数组形式；turso 的 execute 对 ? 占位符用 args 数组
  return p;
}

async function query(sql, params) {
  const args = toArray(params);
  if (USE_TURSO) {
    const rs = await tursoClient.execute({ sql, args });
    return rs.rows.map(r => {
      const o = {};
      rs.columns.forEach((col, i) => { o[col.name] = r[i]; });
      return o;
    });
  }
  return sqlite.prepare(sql).all(...args);
}

async function queryOne(sql, params) {
  const args = toArray(params);
  if (USE_TURSO) {
    const rs = await tursoClient.execute({ sql, args });
    if (rs.rows.length === 0) return null;
    const r = rs.rows[0];
    const o = {};
    rs.columns.forEach((col, i) => { o[col.name] = r[i]; });
    return o;
  }
  return sqlite.prepare(sql).get(...args) || null;
}

async function run(sql, params) {
  const args = toArray(params);
  if (USE_TURSO) {
    const rs = await tursoClient.execute({ sql, args });
    const id = rs.lastInsertRowid != null ? Number(rs.lastInsertRowid) : undefined;
    return { lastInsertRowid: id, changes: rs.rowsAffected || 0 };
  }
  const r = sqlite.prepare(sql).run(...args);
  return { lastInsertRowid: r.lastInsertRowid, changes: r.changes };
}

async function execBatch(statements) {
  if (USE_TURSO) {
    await tursoClient.batch(statements.map(s => ({ sql: s.sql || s, args: s.args || [] })), 'write');
    return;
  }
  const tx = sqlite.transaction((stmts) => {
    for (const s of stmts) {
      if (typeof s === 'string') sqlite.exec(s);
      else sqlite.prepare(s.sql).run(...(s.args || []));
    }
  });
  return tx(statements);
}

// transaction() 包装：传入的 fn 是 async 函数
// Turso 和本地 SQLite 都统一用显式 BEGIN IMMEDIATE / COMMIT / ROLLBACK 串行事务
// （原因：better-sqlite3 原生 transaction() 不接受返回 Promise 的异步函数）
function transaction(fn) {
  return async function wrapped(...args) {
    if (USE_TURSO) {
      await tursoClient.execute('BEGIN IMMEDIATE');
    } else {
      sqlite.exec('BEGIN IMMEDIATE');
    }
    try {
      const result = await fn(...args);
      if (USE_TURSO) await tursoClient.execute('COMMIT');
      else sqlite.exec('COMMIT');
      return result;
    } catch (e) {
      try {
        if (USE_TURSO) await tursoClient.execute('ROLLBACK');
        else sqlite.exec('ROLLBACK');
      } catch (_) {}
      throw e;
    }
  };
}

// schema 初始化脚本用：执行多条 CREATE TABLE 语句
async function execScript(sql) {
  if (USE_TURSO) {
    const stmts = sql.split(';').map(s => s.trim()).filter(Boolean);
    for (const s of stmts) await tursoClient.execute(s);
    return;
  }
  sqlite.exec(sql);
}

// 给 init-db 用的原生访问器（仅本地）
function getRawDb() {
  if (USE_TURSO) return null;
  return sqlite;
}

module.exports = {
  USE_TURSO,
  tursoClient,
  db: sqlite,
  query,
  queryOne,
  run,
  transaction,
  execBatch,
  execScript,
  getRawDb,
};
