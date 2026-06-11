var Database = require('better-sqlite3');
var path = require('path');

var dbPath = path.join(__dirname, 'stackmaster.db');

function initDatabase() {
  var db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      active_skin TEXT NOT NULL DEFAULT 'classic',
      nickname TEXT NOT NULL DEFAULT '',
      games_played INTEGER NOT NULL DEFAULT 0,
      total_layers INTEGER NOT NULL DEFAULT 0,
      revive_tokens INTEGER NOT NULL DEFAULT 0,
      last_item_refresh TEXT NOT NULL DEFAULT (date('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'normal',
      game_type TEXT NOT NULL DEFAULT 'stack',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      skin_id TEXT NOT NULL,
      purchased_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, skin_id)
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      ach_id TEXT NOT NULL,
      unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, ach_id)
    );

    CREATE TABLE IF NOT EXISTS user_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item_type TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, item_type)
    );

    CREATE INDEX IF NOT EXISTS idx_scores_user ON scores(user_id, score DESC);
    CREATE INDEX IF NOT EXISTS idx_scores_diff ON scores(difficulty, score DESC);
    CREATE INDEX IF NOT EXISTS idx_ach_user ON achievements(user_id);
  `);

  // 数据库迁移：给老表加新字段
  try {
    var cols = db.prepare("PRAGMA table_info(scores)").all();
    var hasGameType = false;
    for (var i = 0; i < cols.length; i++) {
      if (cols[i].name === 'game_type') hasGameType = true;
    }
    if (!hasGameType) {
      db.exec("ALTER TABLE scores ADD COLUMN game_type TEXT NOT NULL DEFAULT 'stack'");
      console.log('数据库迁移：已添加 game_type 字段');
    }
  } catch(e) { console.log('迁移跳过:', e.message); }

  try {
    var ucols = db.prepare("PRAGMA table_info(users)").all();
    var hasNickname = false;
    for (var j = 0; j < ucols.length; j++) {
      if (ucols[j].name === 'nickname') hasNickname = true;
    }
    if (!hasNickname) {
      db.exec("ALTER TABLE users ADD COLUMN nickname TEXT NOT NULL DEFAULT ''");
      console.log('数据库迁移：已添加 nickname 字段');
    }
    var hasRevive = false;
    for (var k = 0; k < ucols.length; k++) {
      if (ucols[k].name === 'revive_tokens') hasRevive = true;
    }
    if (!hasRevive) {
      db.exec("ALTER TABLE users ADD COLUMN revive_tokens INTEGER NOT NULL DEFAULT 0");
    }
    var hasRefresh = false;
    for (var m = 0; m < ucols.length; m++) {
      if (ucols[m].name === 'last_item_refresh') hasRefresh = true;
    }
    if (!hasRefresh) {
      db.exec("ALTER TABLE users ADD COLUMN last_item_refresh TEXT NOT NULL DEFAULT (date('now'))");
    }
    var hasGames = false;
    for (var n = 0; n < ucols.length; n++) {
      if (ucols[n].name === 'games_played') hasGames = true;
    }
    if (!hasGames) {
      db.exec("ALTER TABLE users ADD COLUMN games_played INTEGER NOT NULL DEFAULT 0");
      db.exec("ALTER TABLE users ADD COLUMN total_layers INTEGER NOT NULL DEFAULT 0");
    }
  } catch(e) { console.log('迁移跳过:', e.message); }

  console.log('数据库已就绪: ' + dbPath);
  return db;
}

module.exports = { initDatabase: initDatabase };
