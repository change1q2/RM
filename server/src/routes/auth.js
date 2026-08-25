const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryOne, run } = require('../db');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

// 系统状态（始终允许注册）
router.get('/status', async (req, res) => {
  const user = await queryOne('SELECT id, username FROM users LIMIT 1');
  res.json({ initialized: !!user });
});

// 注册新用户
router.post('/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  if (String(username).length < 2) {
    return res.status(400).json({ error: '用户名至少2位' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: '密码长度至少6位' });
  }

  // 检查用户名是否已存在
  const existing = await queryOne('SELECT id FROM users WHERE username = ?', [String(username)]);
  if (existing) {
    return res.status(409).json({ error: '用户名已被注册' });
  }

  const hash = bcrypt.hashSync(String(password), 10);
  const result = await run(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)',
    [String(username), hash]
  );
  const userId = result.lastInsertRowid;
  const token = jwt.sign({ id: userId, username: String(username) }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id: userId, username: String(username) } });
});

// 初始化管理员（保留向后兼容）
router.post('/init', async (req, res) => {
  const existing = await queryOne('SELECT id FROM users LIMIT 1');
  if (existing) {
    return res.status(400).json({ error: '系统已初始化，请直接登录或注册' });
  }
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: '密码长度至少6位' });
  }
  const hash = bcrypt.hashSync(String(password), 10);
  const result = await run(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)',
    [String(username), hash]
  );
  const token = jwt.sign({ id: result.lastInsertRowid, username: String(username) }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id: result.lastInsertRowid, username: String(username) } });
});

// 登录
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  const user = await queryOne('SELECT * FROM users WHERE username = ?', [String(username)]);
  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    return res.status(401).json({ error: '账号或密码错误' });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username } });
});

router.get('/me', authMiddleware, async (req, res) => {
  const user = await queryOne('SELECT id, username, created_at FROM users WHERE id = ?', [req.user.id]);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  res.json(user);
});

router.post('/change-password', authMiddleware, async (req, res) => {
  const { old_password, new_password } = req.body || {};
  if (!old_password || !new_password) {
    return res.status(400).json({ error: '原密码和新密码不能为空' });
  }
  if (String(new_password).length < 6) {
    return res.status(400).json({ error: '新密码长度至少6位' });
  }
  const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user || !bcrypt.compareSync(String(old_password), user.password_hash)) {
    return res.status(400).json({ error: '原密码不正确' });
  }
  const hash = bcrypt.hashSync(String(new_password), 10);
  await run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hash, req.user.id]);
  res.json({ ok: true, message: '密码修改成功' });
});

module.exports = router;
