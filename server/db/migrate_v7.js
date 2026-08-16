/**
 * v7.0 Migration: 测试账号
 * - users 增加 is_test 标记
 * - 预置 admin_test 测试账号（密码由环境变量 TEST_ADMIN_PASSWORD 提供）
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

  // 安全修复：密码由环境变量 TEST_ADMIN_PASSWORD 提供，不再硬编码明文密码；
  // 未配置时跳过创建。
  const testPassword = (process.env.TEST_ADMIN_PASSWORD || '').trim();
  if (!existing && !testPassword) {
    console.log('  skipped: TEST_ADMIN_PASSWORD 未配置，不创建测试账号');
  } else if (!existing) {
    db.prepare(`
      INSERT INTO users (username, password_hash, is_admin, is_test, status, created_at)
      VALUES ('admin_test', ?, 1, 1, 'active', ?)
    `).run(hashPassword(testPassword), new Date().toISOString());
    console.log('  admin_test created (password from TEST_ADMIN_PASSWORD)');
  } else {
    // 已存在：仅确保 is_test 标记，不再强制 is_admin/status，避免重新提权
    db.prepare('UPDATE users SET is_test = 1 WHERE id = ?').run(existing.id);
    console.log('  admin_test already exists, ensured is_test flag');
  }

  console.log('\n=== v7.0 Migration Complete ===');
  closeDb();
}

migrate();
