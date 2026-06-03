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

  console.log('数据库已就绪: ' + dbPath);
  return db;
}

module.exports = { initDatabase: initDatabase };
