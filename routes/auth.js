var express = require('express');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');

function createAuthRouter(db) {

  var router = express.Router();

  // POST /api/auth/register
  router.post('/register', function(req, res) {
    var username = (req.body.username || '').trim();
    var password = (req.body.password || '');

    // 验证
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: '用户名需要 3-20 个字符' });
    }
    if (!/^[a-zA-Z0-9_一-龥]+$/.test(username)) {
      return res.status(400).json({ error: '用户名只能包含字母、数字、下划线和中文' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少需要 6 个字符' });
    }

    // 检查用户名是否已存在
    var existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ error: '用户名已被注册' });
    }

    // 哈希密码
    var hash = bcrypt.hashSync(password, 10);

    // 插入用户
    var result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
    var userId = result.lastInsertRowid;

    // 生成 token
    var token = jwt.sign({ id: userId, username: username }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token: token,
      user: { id: userId, username: username, activeSkin: 'classic' }
    });
  });

  // POST /api/auth/login
  router.post('/login', function(req, res) {
    var username = (req.body.username || '').trim();
    var password = req.body.password || '';

    if (!username || !password) {
      return res.status(400).json({ error: '请输入用户名和密码' });
    }

    var user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    var token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token: token,
      user: { id: user.id, username: user.username, activeSkin: user.active_skin }
    });
  });

  // GET /api/auth/me
  router.get('/me', require('../middleware/auth'), function(req, res) {
    var user = db.prepare('SELECT id, username, nickname, active_skin, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 获取拥有的皮肤
    var purchased = db.prepare('SELECT skin_id FROM purchases WHERE user_id = ?').all(req.user.id);
    var ownedSkins = ['classic'];
    for (var i = 0; i < purchased.length; i++) {
      if (ownedSkins.indexOf(purchased[i].skin_id) < 0) {
        ownedSkins.push(purchased[i].skin_id);
      }
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname || user.username,
        activeSkin: user.active_skin,
        ownedSkins: ownedSkins,
        createdAt: user.created_at
      }
    });
  });

  // PUT /api/auth/password — 修改密码
  router.put('/password', require('../middleware/auth'), function(req, res) {
    var oldPass = req.body.oldPassword || '';
    var newPass = req.body.newPassword || '';

    if (newPass.length < 6) {
      return res.status(400).json({ error: '新密码至少需要6个字符' });
    }

    var user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    if (!user || !bcrypt.compareSync(oldPass, user.password_hash)) {
      return res.status(400).json({ error: '原密码错误' });
    }

    var hash = bcrypt.hashSync(newPass, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
    res.json({ success: true, message: '密码修改成功' });
  });

  // PUT /api/auth/nickname — 修改昵称（不影响登录账号）
  router.put('/nickname', require('../middleware/auth'), function(req, res) {
    var newName = (req.body.nickname || '').trim();
    if (newName.length < 2 || newName.length > 20) {
      return res.status(400).json({ error: '昵称需要2-20个字符' });
    }
    db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(newName, req.user.id);
    res.json({ success: true, nickname: newName });
  });

  return router;
}

module.exports = createAuthRouter;
