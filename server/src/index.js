require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('./middleware/auth');

// 生产环境前端构建产物路径（提前声明，/api/health 诊断也要用）
const clientDist = path.join(__dirname, '../../client/dist');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(req.method + ' ' + req.originalUrl + ' ' + res.statusCode + ' ' + (Date.now() - start) + 'ms');
  });
  next();
});

app.get('/api/health', async (req, res) => {
  // 线上诊断：返回关键环境状态 + 实测 Turso 连接，便于排查登录失败等运行时问题
  const info = {
    ok: true,
    useTurso: !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN),
    tursoUrl: !!process.env.TURSO_DATABASE_URL,
    tursoToken: !!process.env.TURSO_AUTH_TOKEN,
    jwtSecret: !!process.env.JWT_SECRET,
    clientDistExists: fs.existsSync(clientDist),
    node: process.version,
    cwd: __dirname
  };
  // 实测 Turso 连接 + 查询（本地能连不代表 Vercel 运行时能连）
  try {
    const { queryOne } = require('./db');
    const u = await queryOne('SELECT COUNT(*) c FROM users');
    info.tursoConnect = 'ok';
    info.userCount = u.c;
  } catch (e) {
    info.tursoConnect = 'fail';
    info.tursoError = e.message;
    info.tursoCode = e.code;
  }
  res.json(info);
});
app.use('/api/auth', require('./routes/auth'));
app.use('/api/persons', authMiddleware, require('./routes/persons'));
app.use('/api/tags', authMiddleware, require('./routes/tags'));
app.use('/api/meta', authMiddleware, require('./routes/meta'));
app.use('/api/relationships', authMiddleware, require('./routes/relationships'));
app.use('/api/interactions', authMiddleware, require('./routes/interactions'));
app.use('/api/graph', authMiddleware, require('./routes/graph'));
app.use('/api/data', authMiddleware, require('./routes/data'));

// 生产环境：托管构建后的前端静态文件
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api|\/uploads).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log('已加载前端静态文件：' + clientDist);
}

app.use((err, req, res, next) => {
  console.error('ERROR:', err.message);
  res.status(err.status || 500).json({ error: err.message || '服务器内部错误' });
});

// 仅在本地直接运行 (node src/index.js) 时启动 HTTP 服务
// Vercel Serverless 环境下由 api/index.js 导出 app 作为函数处理器, 不能 listen
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('服务器已启动: http://localhost:' + PORT);
  });
}

module.exports = app;
