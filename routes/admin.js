var express = require('express');
var auth = require('../middleware/auth');

var ADMIN_USER = 'admin';

function createAdminRouter(db) {

  var router = express.Router();

  // 管理员鉴权中间件
  function adminAuth(req, res, next) {
    var header = req.headers['authorization'];
    if (!header) return res.status(401).json({ error: '需要登录' });
    try {
      var jwt = require('jsonwebtoken');
      var parts = header.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        var payload = jwt.verify(parts[1], process.env.JWT_SECRET);
        if (payload.username !== ADMIN_USER) {
          return res.status(403).json({ error: '无管理员权限' });
        }
        req.user = payload;
        next();
      } else {
        return res.status(401).json({ error: '无效的认证格式' });
      }
    } catch(e) {
      return res.status(401).json({ error: '登录已过期' });
    }
  }

  // GET /api/admin/stats — 仪表盘数据
  router.get('/stats', adminAuth, function(req, res) {
    var userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
    var scoreCount = db.prepare('SELECT COUNT(*) as cnt FROM scores').get();
    var totalRevenue = db.prepare('SELECT COUNT(*) as cnt FROM purchases').get();
    var todayUsers = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE date(created_at) = date('now')").get();
    var todayGames = db.prepare("SELECT COUNT(*) as cnt FROM scores WHERE date(created_at) = date('now')").get();

    // 皮肤购买分布
    var skinSales = db.prepare('SELECT skin_id, COUNT(*) as cnt FROM purchases GROUP BY skin_id').all();

    // 难度分布
    var diffDist = db.prepare('SELECT difficulty, COUNT(*) as cnt FROM scores GROUP BY difficulty').all();

    // 最近7天活跃
    var dailyActive = db.prepare(`
      SELECT date(created_at) as day, COUNT(DISTINCT user_id) as users, COUNT(*) as games
      FROM scores
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY date(created_at)
      ORDER BY day DESC
    `).all();

    res.json({
      users: userCount.cnt,
      scores: scoreCount.cnt,
      revenue: totalRevenue.cnt,
      todayUsers: todayUsers.cnt,
      todayGames: todayGames.cnt,
      skinSales: skinSales,
      difficultyDistribution: diffDist,
      dailyActive: dailyActive
    });
  });

  // GET /api/admin/users — 用户列表
  router.get('/users', adminAuth, function(req, res) {
    var users = db.prepare(`
      SELECT u.id, u.username, u.games_played, u.total_layers, u.created_at,
        (SELECT COUNT(*) FROM purchases WHERE user_id = u.id) as skin_count
      FROM users u
      ORDER BY u.id DESC
      LIMIT 50
    `).all();
    res.json({ users: users });
  });

  return router;
}

module.exports = createAdminRouter;
