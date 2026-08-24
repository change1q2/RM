const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'rm-crm-dev-secret-change-me-2026';

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ error: '未登录或缺少认证令牌' });
  }
  try {
    const payload = jwt.verify(match[1], JWT_SECRET);
    req.user = { id: payload.id, username: payload.username };
    next();
  } catch (e) {
    return res.status(401).json({ error: '认证令牌无效或已过期' });
  }
}

module.exports = { authMiddleware, JWT_SECRET };
