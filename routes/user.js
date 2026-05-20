var express = require('express');
var auth = require('../middleware/auth');

var ACHIEVEMENTS = [
  { id:'first_game',  name:'初次尝试',   desc:'完成第一局游戏',       emoji:'🎮' },
  { id:'score_10',    name:'初出茅庐',   desc:'单局达到10层',         emoji:'⭐' },
  { id:'score_30',    name:'小有成就',   desc:'单局达到30层',         emoji:'🌟' },
  { id:'score_50',    name:'堆塔高手',   desc:'单局达到50层',         emoji:'🏅' },
  { id:'score_80',    name:'出神入化',   desc:'单局达到80层',         emoji:'🎖️' },
  { id:'score_100',   name:'叠塔大师',   desc:'单局达到100层',        emoji:'👑' },
  { id:'hard_20',     name:'迎难而上',   desc:'困难模式达到20层',     emoji:'💪' },
  { id:'hard_40',     name:'绝境求生',   desc:'困难模式达到40层',     emoji:'🔥' },
  { id:'play_10',     name:'常驻玩家',   desc:'累计完成10局游戏',     emoji:'📅' },
  { id:'play_50',     name:'忠实玩家',   desc:'累计完成50局游戏',     emoji:'💎' },
  { id:'layers_100',  name:'积少成多',   desc:'累计堆叠100层',        emoji:'📊' },
  { id:'layers_500',  name:'坚持不懈',   desc:'累计堆叠500层',        emoji:'🏔️' },
  { id:'layers_1000', name:'万里长城',   desc:'累计堆叠1000层',       emoji:'🏯' },
  { id:'collector',   name:'皮肤收藏家', desc:'集齐全部5款皮肤',      emoji:'🎨' },
  { id:'rich',        name:'氪金大佬',   desc:'购买金色传说皮肤',     emoji:'💰' }
];

// 道具包定义
var ITEM_PACKS = [
  { id:'pack_slow_5',   name:'减速礼包', itemType:'slow',   qty:5,  price:2, emoji:'🐢' },
  { id:'pack_freeze_5', name:'冻结礼包', itemType:'freeze', qty:5,  price:2, emoji:'❄️' },
  { id:'pack_expand_5', name:'扩展礼包', itemType:'expand', qty:5,  price:2, emoji:'📏' },
  { id:'pack_mega',     name:'全能大礼包', itemType:'all',  qty:3,  price:5, emoji:'🎁' }
];

function createUserRouter(db) {

  var router = express.Router();

  // ===== 成就 =====
  router.get('/achievements', function(req, res) {
    var unlocked = [];
    var header = req.headers['authorization'];
    if (header) {
      try {
        var jwt = require('jsonwebtoken');
        var parts = header.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
          var payload = jwt.verify(parts[1], process.env.JWT_SECRET);
          var rows = db.prepare('SELECT ach_id FROM achievements WHERE user_id = ?').all(payload.id);
          for (var i = 0; i < rows.length; i++) unlocked.push(rows[i].ach_id);
        }
      } catch(e) {}
    }
    res.json({ achievements: ACHIEVEMENTS, unlocked: unlocked });
  });

  // ===== 统计 =====
  router.get('/stats', auth, function(req, res) {
    var user = db.prepare('SELECT games_played, total_layers, revive_tokens FROM users WHERE id = ?').get(req.user.id);
    var achCount = db.prepare('SELECT COUNT(*) as cnt FROM achievements WHERE user_id = ?').get(req.user.id);
    var purchases = db.prepare('SELECT skin_id FROM purchases WHERE user_id = ?').all(req.user.id);
    var owned = ['classic'];
    for (var i = 0; i < purchases.length; i++) owned.push(purchases[i].skin_id);

    var bests = db.prepare('SELECT difficulty, MAX(score) as best FROM scores WHERE user_id = ? GROUP BY difficulty').all(req.user.id);
    var bestByDiff = {};
    for (var j = 0; j < bests.length; j++) bestByDiff[bests[j].difficulty] = bests[j].best;

    res.json({
      gamesPlayed: user.games_played,
      totalLayers: user.total_layers,
      achievementsUnlocked: achCount.cnt,
      achievementsTotal: ACHIEVEMENTS.length,
      ownedSkins: owned,
      bestByDifficulty: bestByDiff,
      reviveTokens: user.revive_tokens
    });
  });

  // ===== 每日签到 + 道具查询 =====
  router.get('/items', auth, function(req, res) {
    // 检查是否需要每日刷新
    var user = db.prepare('SELECT last_item_refresh FROM users WHERE id = ?').get(req.user.id);
    var today = new Date().toISOString().slice(0, 10);
    if (!user || user.last_item_refresh !== today) {
      // 每日刷新：重置道具到3个
      db.prepare('DELETE FROM user_items WHERE user_id = ?').run(req.user.id);
      db.prepare('UPDATE users SET last_item_refresh = ? WHERE id = ?').run(today, req.user.id);
    }

    // 查询当前道具
    var rows = db.prepare('SELECT item_type, quantity FROM user_items WHERE user_id = ?').all(req.user.id);
    var items = { slow: 3, freeze: 3, expand: 3 };
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r.quantity > 3) items[r.item_type] = r.quantity; // 购买的可以超过3个
      else items[r.item_type] = Math.max(3, r.quantity);
    }

    // 获取复活令牌
    var rt = db.prepare('SELECT revive_tokens FROM users WHERE id = ?').get(req.user.id);
    var reviveTokens = rt ? rt.revive_tokens : 0;

    res.json({ items: items, reviveTokens: reviveTokens, refreshed: user && user.last_item_refresh !== today });
  });

  // ===== 使用道具 =====
  router.post('/items/use', auth, function(req, res) {
    var itemType = req.body.itemType;
    if (['slow', 'freeze', 'expand'].indexOf(itemType) < 0) {
      return res.status(400).json({ error: '无效的道具类型' });
    }

    var row = db.prepare('SELECT quantity FROM user_items WHERE user_id = ? AND item_type = ?').get(req.user.id, itemType);
    var qty = row ? row.quantity : 3;

    if (qty <= 0) {
      return res.status(400).json({ error: '道具已用完' });
    }

    if (row) {
      db.prepare('UPDATE user_items SET quantity = quantity - 1 WHERE user_id = ? AND item_type = ?').run(req.user.id, itemType);
    } else {
      db.prepare('INSERT INTO user_items (user_id, item_type, quantity) VALUES (?, ?, 2)').run(req.user.id, itemType);
    }

    res.json({ itemType: itemType, remaining: qty - 1 });
  });

  // ===== 道具商城列表 =====
  router.get('/shop', function(req, res) {
    res.json({ packs: ITEM_PACKS });
  });

  // ===== 购买道具包 =====
  router.post('/shop/buy', auth, function(req, res) {
    var packId = req.body.packId;
    var pack = null;
    for (var i = 0; i < ITEM_PACKS.length; i++) {
      if (ITEM_PACKS[i].id === packId) { pack = ITEM_PACKS[i]; break; }
    }
    if (!pack) return res.status(404).json({ error: '礼包不存在' });

    // 模拟支付成功，增加道具
    if (pack.itemType === 'all') {
      // 全能大礼包：每种3个
      ['slow', 'freeze', 'expand'].forEach(function(t) {
        var row = db.prepare('SELECT id, quantity FROM user_items WHERE user_id = ? AND item_type = ?').get(req.user.id, t);
        if (row) {
          db.prepare('UPDATE user_items SET quantity = quantity + ? WHERE user_id = ? AND item_type = ?').run(pack.qty, req.user.id, t);
        } else {
          db.prepare('INSERT INTO user_items (user_id, item_type, quantity) VALUES (?, ?, ?)').run(req.user.id, t, 3 + pack.qty);
        }
      });
    } else {
      var row = db.prepare('SELECT id, quantity FROM user_items WHERE user_id = ? AND item_type = ?').get(req.user.id, pack.itemType);
      if (row) {
        db.prepare('UPDATE user_items SET quantity = quantity + ? WHERE user_id = ? AND item_type = ?').run(pack.qty, req.user.id, pack.itemType);
      } else {
        db.prepare('INSERT INTO user_items (user_id, item_type, quantity) VALUES (?, ?, ?)').run(req.user.id, pack.itemType, 3 + pack.qty);
      }
    }

    res.json({ success: true, pack: pack });
  });

  // ===== 购买复活令牌 =====
  router.post('/buy-revive', auth, function(req, res) {
    // 模拟支付 ¥2
    db.prepare('UPDATE users SET revive_tokens = revive_tokens + 1 WHERE id = ?').run(req.user.id);
    res.json({ success: true, message: '复活令牌+1' });
  });

  // ===== 游戏历史 =====
  router.get('/history', auth, function(req, res) {
    var rows = db.prepare(`
      SELECT score, difficulty, created_at
      FROM scores WHERE user_id = ?
      ORDER BY created_at DESC LIMIT 20
    `).all(req.user.id);
    var history = [];
    var diffLabels = {easy:'🟢 简单', normal:'🟡 普通', hard:'🔴 困难'};
    for (var i = 0; i < rows.length; i++) {
      history.push({
        score: rows[i].score,
        difficulty: rows[i].difficulty,
        difficultyLabel: diffLabels[rows[i].difficulty] || rows[i].difficulty,
        date: rows[i].created_at
      });
    }
    res.json({ history: history });
  });

  // ===== 使用复活 =====
  router.post('/use-revive', auth, function(req, res) {
    var user = db.prepare('SELECT revive_tokens FROM users WHERE id = ?').get(req.user.id);
    if (!user || user.revive_tokens <= 0) {
      return res.status(400).json({ error: '没有复活令牌' });
    }
    db.prepare('UPDATE users SET revive_tokens = revive_tokens - 1 WHERE id = ?').run(req.user.id);
    res.json({ success: true, remainingTokens: user.revive_tokens - 1 });
  });

  return router;
}

module.exports = createUserRouter;
