var express = require('express');
var auth = require('../middleware/auth');

// 皮肤定义（服务端作为价格权威来源）
var SKINS = [
  { id: 'classic', name: '经典木纹',  price: 0 },
  { id: 'neon',    name: '霓虹之夜',  price: 3 },
  { id: 'cyber',   name: '赛博朋克',  price: 3 },
  { id: 'catpaw',  name: '猫爪肉球',  price: 3 },
  { id: 'golden',  name: '金色传说',  price: 6 }
];

function createShopRouter(db) {

  var router = express.Router();

  // GET /api/shop/skins — 皮肤列表 + 用户拥有状态
  router.get('/skins', function(req, res) {
    var owned = [];
    var active = 'classic';

    // 如果带了 token 且有效，获取用户数据
    var header = req.headers['authorization'];
    if (header) {
      try {
        var jwt = require('jsonwebtoken');
        var parts = header.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
          var payload = jwt.verify(parts[1], process.env.JWT_SECRET);
          var purchases = db.prepare('SELECT skin_id FROM purchases WHERE user_id = ?').all(payload.id);
          var user = db.prepare('SELECT active_skin FROM users WHERE id = ?').get(payload.id);
          owned = ['classic'];
          for (var i = 0; i < purchases.length; i++) {
            owned.push(purchases[i].skin_id);
          }
          active = user ? user.active_skin : 'classic';
        }
      } catch(e) {
        // token 无效，当作游客处理
      }
    }

    res.json({
      skins: SKINS,
      owned: owned,
      active: active
    });
  });

  // POST /api/shop/purchase — 购买皮肤
  router.post('/purchase', auth, function(req, res) {
    var skinId = (req.body.skinId || '').trim();
    if (!skinId) {
      return res.status(400).json({ error: '请指定皮肤' });
    }

    // 检查皮肤是否存在
    var skin = null;
    for (var i = 0; i < SKINS.length; i++) {
      if (SKINS[i].id === skinId) { skin = SKINS[i]; break; }
    }
    if (!skin) {
      return res.status(404).json({ error: '皮肤不存在' });
    }

    // 免费皮肤直接使用
    if (skin.price === 0) {
      return res.status(400).json({ error: '经典木纹无需购买' });
    }

    // 检查是否已购买
    var existing = db.prepare('SELECT id FROM purchases WHERE user_id = ? AND skin_id = ?').get(req.user.id, skinId);
    if (existing) {
      return res.status(409).json({ error: '你已经拥有这个皮肤了' });
    }

    // 记录购买（模拟支付，实际上线时在此处验证支付凭证）
    db.prepare('INSERT INTO purchases (user_id, skin_id) VALUES (?, ?)').run(req.user.id, skinId);

    // 自动装备新皮肤
    db.prepare('UPDATE users SET active_skin = ? WHERE id = ?').run(skinId, req.user.id);

    // 返回最新的拥有列表
    var purchases = db.prepare('SELECT skin_id FROM purchases WHERE user_id = ?').all(req.user.id);
    var owned = ['classic'];
    for (var j = 0; j < purchases.length; j++) {
      owned.push(purchases[j].skin_id);
    }

    res.json({ success: true, activeSkin: skinId, ownedSkins: owned });
  });

  // POST /api/shop/equip — 装备皮肤
  router.post('/equip', auth, function(req, res) {
    var skinId = (req.body.skinId || '').trim();
    if (!skinId) {
      return res.status(400).json({ error: '请指定皮肤' });
    }

    // 检查皮肤是否存在
    var skin = null;
    for (var i = 0; i < SKINS.length; i++) {
      if (SKINS[i].id === skinId) { skin = SKINS[i]; break; }
    }
    if (!skin) {
      return res.status(404).json({ error: '皮肤不存在' });
    }

    // 免费皮肤直接装备
    if (skin.price > 0) {
      // 检查是否已购买
      var owns = db.prepare('SELECT id FROM purchases WHERE user_id = ? AND skin_id = ?').get(req.user.id, skinId);
      if (!owns) {
        return res.status(403).json({ error: '请先购买这个皮肤' });
      }
    }

    // 更新装备
    db.prepare('UPDATE users SET active_skin = ? WHERE id = ?').run(skinId, req.user.id);

    res.json({ success: true, activeSkin: skinId });
  });

  return router;
}

module.exports = createShopRouter;
