const sqlite3 = require("sqlite3").verbose();

let db;

function initDb(filePath) {
  if (db) return db;
  db = new sqlite3.Database(filePath);

  db.serialize(() => {
    db.run("PRAGMA foreign_keys = ON;");

    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        verified INTEGER NOT NULL DEFAULT 0,
        verify_code TEXT,
        verify_expires_at INTEGER,
        created_at INTEGER NOT NULL
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        section TEXT NOT NULL CHECK (section IN ('internal','external')),
        title TEXT NOT NULL,
        body TEXT,
        url TEXT,
        author_id INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(author_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        author_id INTEGER NOT NULL,
        body TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY(author_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  });

  return db;
}

function getDb() {
  if (!db) throw new Error("DB not initialized. Call initDb() first.");
  return db;
}

module.exports = { initDb, getDb };
