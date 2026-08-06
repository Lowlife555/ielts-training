const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'ielts.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

/** Get current user ID — always returns the first user */
function getUserId() {
  const database = getDb();
  const user = database.prepare('SELECT id FROM users ORDER BY id LIMIT 1').get();
  return user ? user.id : 1;
}

module.exports = { getDb, closeDb, DB_PATH, getUserId };
