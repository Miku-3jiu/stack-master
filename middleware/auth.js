var jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  var header = req.headers['authorization'];
  if (!header) {
    return res.status(401).json({ error: '需要登录' });
  }

  var parts = header.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: '无效的认证格式' });
  }

  try {
    var payload = jwt.verify(parts[1], process.env.JWT_SECRET);
    req.user = { id: payload.id, username: payload.username };
    next();
  } catch (e) {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

module.exports = authMiddleware;
