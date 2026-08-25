const path = require('path');
const fs = require('fs');
require('dotenv').config();

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
const USE_TURSO = !!(TURSO_URL && TURSO_TOKEN);

let sqlite = null;
let tursoClient = null;
let backendReady = false;
// Turso 模式下的事务上下文：transaction() 期间非 null，query/queryOne/run 自动路由到它
// 原因：Turso HTTP 协议每个 execute 是独立请求，裸 BEGIN/COMMIT 跨请求会丢事务上下文
let activeTx = null;

// 懒加载：首次访问数据库时才初始化连接
// 原因：Vercel Serverless 缺 Turso 环境变量时，模块顶层 new Database() 会因只读文件系统抛错，
// 导致整个函数冷启动崩溃（连 /api/health 这种不碰 DB 的接口都挂）。
// 改为懒加载后，未配置 Turso 时 /api/health 仍可响应，DB 接口返回清晰错误。
function ensureBackend() {
  if (backendReady) return;
  if (USE_TURSO) {
    // 用纯 HTTP 入口（@libsql/client/http），避免加载 libsql 原生模块（@libsql-linux-x64-gnu）
    // 主入口 require('@libsql/client') 会静态 require('libsql')，导致 Vercel Linux 环境因缺原生绑定炸掉
    const { createClient } = require('@libsql/client/http');
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
  backendReady = true;
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
  // 规范化：libsql hrana 协议比 better-sqlite3 严格
  // - BigInt → Number（Turso 读出的 INTEGER 是 BigInt，回传时不被接受）
  // - undefined → null（better-sqlite3 把 undefined 当 null，libsql 直接报 Unsupported type）
  // - boolean → 1/0（libsql 接受 boolean，但保险起见统一数值化）
  return p.map(v => {
    if (typeof v === 'bigint') return Number(v);
    if (v === undefined) return null;
    if (typeof v === 'boolean') return v ? 1 : 0;
    return v;
  });
}

async function query(sql, params) {
  ensureBackend();
  const args = toArray(params);
  if (USE_TURSO) {
    const rs = await (activeTx || tursoClient).execute({ sql, args });
    return rs.rows.map(r => {
      const o = {};
      rs.columns.forEach((col, i) => { o[typeof col === 'string' ? col : col.name] = typeof r[i] === 'bigint' ? Number(r[i]) : r[i]; });
      return o;
    });
  }
  return sqlite.prepare(sql).all(...args);
}

async function queryOne(sql, params) {
  ensureBackend();
  const args = toArray(params);
  if (USE_TURSO) {
    const rs = await (activeTx || tursoClient).execute({ sql, args });
    if (rs.rows.length === 0) return null;
    const r = rs.rows[0];
    const o = {};
    rs.columns.forEach((col, i) => { o[typeof col === 'string' ? col : col.name] = typeof r[i] === 'bigint' ? Number(r[i]) : r[i]; });
    return o;
  }
  return sqlite.prepare(sql).get(...args) || null;
}

async function run(sql, params) {
  ensureBackend();
  const args = toArray(params);
  if (USE_TURSO) {
    const rs = await (activeTx || tursoClient).execute({ sql, args });
    const id = rs.lastInsertRowid != null ? Number(rs.lastInsertRowid) : undefined;
    return { lastInsertRowid: id, changes: rs.rowsAffected || 0 };
  }
  const r = sqlite.prepare(sql).run(...args);
  return { lastInsertRowid: r.lastInsertRowid, changes: r.changes };
}

async function execBatch(statements) {
  ensureBackend();
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
// Turso 模式：用 client.transaction('write') 对象，query/queryOne/run 通过 activeTx 自动路由
// 本地 SQLite：用显式 BEGIN IMMEDIATE / COMMIT / ROLLBACK（单连接，跨请求保持事务）
function transaction(fn) {
  return async function wrapped(...args) {
    ensureBackend();
    if (USE_TURSO) {
      const tx = await tursoClient.transaction('write');
      const prev = activeTx;
      activeTx = tx;
      try {
        const result = await fn(...args);
        await tx.commit();
        return result;
      } catch (e) {
        try { await tx.rollback(); } catch (_) {}
        throw e;
      } finally {
        activeTx = prev;
      }
    }
    sqlite.exec('BEGIN IMMEDIATE');
    try {
      const result = await fn(...args);
      sqlite.exec('COMMIT');
      return result;
    } catch (e) {
      try { sqlite.exec('ROLLBACK'); } catch (_) {}
      throw e;
    }
  };
}

// schema 初始化脚本用：执行多条 CREATE TABLE 语句
async function execScript(sql) {
  ensureBackend();
  if (USE_TURSO) {
    const stmts = sql.split(';').map(s => s.trim()).filter(Boolean);
    for (const s of stmts) await tursoClient.execute(s);
    return;
  }
  sqlite.exec(sql);
}

// 给 init-db 用的原生访问器（仅本地）
function getRawDb() {
  ensureBackend();
  if (USE_TURSO) return null;
  return sqlite;
}

module.exports = {
  USE_TURSO,
  get tursoClient() { return tursoClient; },
  get db() { return sqlite; },
  query,
  queryOne,
  run,
  transaction,
  execBatch,
  execScript,
  getRawDb,
  ensureBackend,
};
