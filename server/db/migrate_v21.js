/**
 * v21.0 Migration: 清除历史硬编码测试账号凭据
 *
 * 早期版本曾预置 admin_test（密码 admin123, is_admin=1）。
 * 本迁移在部署时兜底清理：
 *   - 若已配置 TEST_ADMIN_PASSWORD：将 admin_test 密码重置为该值并保持启用；
 *   - 若未配置且密码仍为 admin123：禁用该账号，消除公网硬编码凭据风险；
 *   - 密码已是其他值：保持现状。
 *
 * IDEMPOTENT: 可重复执行。
 */
const { getDb, closeDb } = require('./database');
const { hashPassword, verifyPassword } = require('../auth');

function migrate() {
  const db = getDb();
  console.log('=== v21.0 Migration: 清理历史 admin_test 凭据 ===\n');

  const row = db.prepare(
    "SELECT id, username, password_hash, status FROM users WHERE username = 'admin_test'"
  ).get();

  if (!row) {
    console.log('  admin_test 不存在，无需处理');
    closeDb();
    return;
  }

  const testPassword = (process.env.TEST_ADMIN_PASSWORD || '').trim();
  // 密码仍是已知硬编码值 admin123 时，属于高危遗留凭据
  const stillDefault = verifyPassword('admin123', row.password_hash);

  if (testPassword) {
    db.prepare("UPDATE users SET password_hash = ?, status = 'active' WHERE id = ?")
      .run(hashPassword(testPassword), row.id);
    console.log('  admin_test 密码已重置为 TEST_ADMIN_PASSWORD，保持启用');
  } else if (stillDefault) {
    db.prepare("UPDATE users SET status = 'disabled' WHERE id = ?").run(row.id);
    console.log('  admin_test 密码仍为 admin123，已禁用；如需启用请配置 TEST_ADMIN_PASSWORD 后重新部署');
  } else {
    console.log('  admin_test 密码非默认值，保持现状');
  }

  console.log('\n=== v21.0 Migration Complete ===');
  closeDb();
}

migrate();
