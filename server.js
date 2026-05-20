var express = require('express');
var path = require('path');

// 加载 .env
require('dotenv').config();

var { initDatabase } = require('./db/database');
var createAuthRouter = require('./routes/auth');
var createLeaderboardRouter = require('./routes/leaderboard');
var createShopRouter = require('./routes/shop');
var createUserRouter = require('./routes/user');
var createAdminRouter = require('./routes/admin');

var app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

var db = initDatabase();

app.use('/api/auth', createAuthRouter(db));
app.use('/api/leaderboard', createLeaderboardRouter(db));
app.use('/api/shop', createShopRouter(db));
app.use('/api/user', createUserRouter(db));
app.use('/api/admin', createAdminRouter(db));

// 回退：非 API 路径返回首页
app.get('*', function(req, res) {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log('叠塔大师服务器已启动: http://localhost:' + PORT);
});
