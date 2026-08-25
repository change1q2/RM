// Vercel Serverless 单函数入口：所有请求（含 API + 前端静态 + SPA 回退）走这里
// Vercel 约定：文件位于 api/index.js，函数地址 = /api
// 但我们通过 vercel.json rewrites 把所有 URL 也转给它，这样 Express 内部决定路由
let app;
let loadError = null;
try {
  require('../server/src/db');
  app = require('../server/src/index');
} catch (e) {
  loadError = { message: e.message, stack: e.stack };
}

module.exports = (req, res) => {
  // 模块加载失败：直接返回错误详情，便于线上诊断
  if (loadError) {
    res.status(500).json({ error: 'Module load failed', detail: loadError.message, stack: loadError.stack });
    return;
  }
  // 将 Vercel 的原始路径透传给 Express（否则只看到 /api 前缀的路径）
  const original = req.headers['x-now-original-url'] || req.headers['x-vercel-original-url'] || req.url;
  if (original && !req.url.startsWith(original)) {
    req.url = original;
  }
  app(req, res);
};
