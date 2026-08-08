/**
 * v7.0 Migration: 测试账号
 * - users 增加 is_test 标记
 * - 预置 admin_test 账号（密码 admin123，管理员 + 测试模式，无惩罚机制）
 *
 * IDEMPOTENT: Safe to run multiple times.
 */
const { getDb, closeDb } = require('./database');
const { hashPassword } = require('../auth');

function migrate() {
  const db = getDb();
  console.log('=== v7.0 Migration: Test Account ===\n');

  console.log('[1/2] Upgrading users...');
  const cols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  if (!cols.includes('is_test')) {
    db.exec("ALTER TABLE users ADD COLUMN is_test INTEGER DEFAULT 0");
    console.log('  Added column: is_test');
  } else {
    console.log('  is_test already exists');
  }

  console.log('\n[2/2] Seeding admin_test...');
  const existing = db.prepare("SELECT id, username FROM users WHERE username = 'admin_test'").get();
  if (!existing) {
    db.prepare(`
      INSERT INTO users (username, password_hash, is_admin, is_test, status, created_at)
      VALUES ('admin_test', ?, 1, 1, 'active', ?)
    `).run(hashPassword('admin123'), new Date().toISOString());
    console.log('  admin_test created (password: admin123)');
  } else {
    db.prepare('UPDATE users SET is_admin = 1, is_test = 1, status = "active" WHERE id = ?').run(existing.id);
    console.log('  admin_test already exists, ensured flags');
  }

  console.log('\n=== v7.0 Migration Complete ===');
  closeDb();
}

migrate();
