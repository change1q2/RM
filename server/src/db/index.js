const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

require('dotenv').config();

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../../data/app.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function query(sql, params = []) {
  return db.prepare(sql).all(params);
}

function queryOne(sql, params = []) {
  return db.prepare(sql).get(params) || null;
}

function run(sql, params = []) {
  return db.prepare(sql).run(params);
}

function transaction(fn) {
  return db.transaction(fn);
}

module.exports = { db, query, queryOne, run, transaction };
