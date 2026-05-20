var express = require('express');
var auth = require('../middleware/auth');

function createLeaderboardRouter(db) {

  var router = express.Router();

  // GET /api/leaderboard?difficulty=normal — 前 20 名（按难度分榜）
  router.get('/', function(req, res) {
    var difficulty = req.query.difficulty || 'normal';

    var rows = db.prepare(`
      SELECT CASE WHEN u.nickname != '' THEN u.nickname ELSE u.username END as display_name, u.username, MAX(s.score) as best_score, MAX(s.created_at) as latest_date
      FROM scores s
      JOIN users u ON u.id = s.user_id
      WHERE s.difficulty = ?
      GROUP BY s.user_id
      ORDER BY best_score DESC
      LIMIT 20
    `).all(difficulty);

    var leaderboard = [];
    for (var i = 0; i < rows.length; i++) {
      leaderboard.push({
        rank: i + 1,
        username: rows[i].display_name,
        score: rows[i].best_score,
        date: rows[i].latest_date
      });
    }

    res.json({ leaderboard: leaderboard, difficulty: difficulty });
  });

  // POST /api/leaderboard — 提交分数（需登录）
  router.post('/', auth, function(req, res) {
    var score = parseInt(req.body.score, 10);
    var difficulty = req.body.difficulty || 'normal';
    var validDiff = ['easy', 'normal', 'hard'];

    if (isNaN(score) || score < 0 || score > 999999) {
      return res.status(400).json({ error: '无效的分数' });
    }
    if (validDiff.indexOf(difficulty) < 0) {
      return res.status(400).json({ error: '无效的难度' });
    }

    // 插入分数
    db.prepare('INSERT INTO scores (user_id, score, difficulty) VALUES (?, ?, ?)').run(req.user.id, score, difficulty);

    // 更新用户统计
    db.prepare('UPDATE users SET games_played = games_played + 1, total_layers = total_layers + ? WHERE id = ?').run(score, req.user.id);

    // 查询该难度下的最高分和排名
    var best = db.prepare('SELECT MAX(score) as best FROM scores WHERE user_id = ? AND difficulty = ?').get(req.user.id, difficulty);
    var bestScore = best ? best.best : score;

    var rankRow = db.prepare(`
      SELECT COUNT(*) as rank FROM (
        SELECT user_id, MAX(score) as best
        FROM scores WHERE difficulty = ?
        GROUP BY user_id HAVING best > ?
      )
    `).get(difficulty, bestScore);

    var rank = rankRow ? rankRow.rank + 1 : 1;

    // 检测成就
    var newAchs = checkAchievements(db, req.user.id, score, difficulty);

    res.json({
      best: { score: bestScore, rank: rank },
      newAchievements: newAchs
    });
  });

  return router;
}

// 成就检测
function checkAchievements(db, userId, score, difficulty) {
  var newAchs = [];

  // 获取用户统计
  var user = db.prepare('SELECT games_played, total_layers FROM users WHERE id = ?').get(userId);
  if (!user) return newAchs;

  var existing = db.prepare('SELECT ach_id FROM achievements WHERE user_id = ?').all(userId);
  var has = {};
  for (var i = 0; i < existing.length; i++) has[existing[i].ach_id] = true;

  function unlock(achId) {
    if (!has[achId]) {
      db.prepare('INSERT INTO achievements (user_id, ach_id) VALUES (?, ?)').run(userId, achId);
      newAchs.push(achId);
    }
  }

  // 单局成就
  if (score >= 10) unlock('score_10');
  if (score >= 30) unlock('score_30');
  if (score >= 50) unlock('score_50');
  if (score >= 80) unlock('score_80');
  if (score >= 100) unlock('score_100');
  if (difficulty === 'hard' && score >= 20) unlock('hard_20');
  if (difficulty === 'hard' && score >= 40) unlock('hard_40');

  // 累计成就
  if (user.games_played >= 1) unlock('first_game');
  if (user.games_played >= 10) unlock('play_10');
  if (user.games_played >= 50) unlock('play_50');
  if (user.total_layers >= 100) unlock('layers_100');
  if (user.total_layers >= 500) unlock('layers_500');
  if (user.total_layers >= 1000) unlock('layers_1000');

  return newAchs;
}

module.exports = createLeaderboardRouter;
