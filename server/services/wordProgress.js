/**
 * 单词进度统一写入服务（消除 lists/spellingTest/meaningTest 三处重复 SQL）
 *
 * 简单计数版：correct_count 累加，达到 masteredThreshold 即 mastered=1，
 * 并更新 next_review_date（答对 +2 天 / 答错 +1 天）。
 *
 * 注意：reviewResult.js 的 SM-2 复习算法（ease_factor/repetitions）与此不同，不在此复用。
 */
function recordAnswer(db, userId, wordId, isCorrect, opts = {}) {
  const { masteredThreshold = 3, correctIntervalDays = 2, incorrectIntervalDays = 1 } = opts;
  const now = new Date().toISOString().split('T')[0];
  const existing = db.prepare(
    'SELECT * FROM user_word_progress WHERE user_id = ? AND word_id = ?'
  ).get(userId, wordId);

  const correct = isCorrect ? 1 : 0;
  const incorrect = isCorrect ? 0 : 1;

  if (existing) {
    const newCorrect = (existing.correct_count || 0) + correct;
    const newIncorrect = (existing.incorrect_count || 0) + incorrect;
    const mastered = newCorrect >= masteredThreshold ? 1 : 0;
    db.prepare(`
      UPDATE user_word_progress
      SET correct_count = ?, incorrect_count = ?, mastered = ?,
          last_review_date = ?, next_review_date = date('now', '+' || ? || ' days')
      WHERE user_id = ? AND word_id = ?
    `).run(newCorrect, newIncorrect, mastered, now, isCorrect ? correctIntervalDays : incorrectIntervalDays, userId, wordId);
  } else {
    db.prepare(`
      INSERT INTO user_word_progress (user_id, word_id, correct_count, incorrect_count, mastered, last_review_date, next_review_date)
      VALUES (?, ?, ?, ?, ?, ?, date('now', '+' || ? || ' days'))
    `).run(userId, wordId, correct, incorrect, 0, now, isCorrect ? correctIntervalDays : incorrectIntervalDays);
  }
}

module.exports = { recordAnswer };
