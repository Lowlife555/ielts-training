const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { requireAuth } = require('../auth');

router.use(requireAuth);

// Submit review result (SM-2 algorithm)
router.post('/', (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const { wordId, quality } = req.body; // quality: 0-5 (SM-2 grading)

  if (!wordId || quality === undefined) {
    return res.status(400).json({ error: 'wordId and quality are required' });
  }

  const progress = db.prepare(
    `SELECT * FROM user_word_progress WHERE user_id = ${userId} AND word_id = ?`
  ).get(wordId);

  if (!progress) {
    return res.status(404).json({ error: 'No progress record found for this word' });
  }

  // SM-2 algorithm
  let { ease_factor, interval_days, repetitions, correct_count, incorrect_count } = progress;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      interval_days = 1;
    } else if (repetitions === 1) {
      interval_days = 6;
    } else {
      interval_days = Math.round(interval_days * ease_factor);
    }
    repetitions += 1;
    correct_count += 1;
  } else {
    // Incorrect response
    repetitions = 0;
    interval_days = 1;
    incorrect_count += 1;
  }

  // Update ease factor
  ease_factor = Math.max(1.3, ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  const mastered = correct_count >= 5 ? 1 : 0;
  const today = new Date().toISOString().split('T')[0];

  db.prepare(`
    UPDATE user_word_progress
    SET ease_factor = ?, interval_days = ?, repetitions = ?,
        correct_count = ?, incorrect_count = ?, mastered = ?,
        last_review_date = ?, next_review_date = date('now', '+' || ? || ' days')
    WHERE user_id = ${userId} AND word_id = ?
  `).run(ease_factor, interval_days, repetitions, correct_count, incorrect_count,
    mastered, today, interval_days, wordId);

  res.json({
    wordId,
    easeFactor: ease_factor,
    intervalDays: interval_days,
    repetitions,
    mastered: !!mastered,
  });
});

module.exports = router;
