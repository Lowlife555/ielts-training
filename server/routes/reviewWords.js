const express = require('express');
const router = express.Router();
const { getDb, getUserId } = require('../db/database');

// Get today's review words
router.get('/', (req, res) => {
  const db = getDb();
  const userId = getUserId();
  const today = new Date().toISOString().split('T')[0];

  const words = db.prepare(`
    SELECT w.*, uwp.ease_factor, uwp.interval_days, uwp.repetitions,
           uwp.correct_count, uwp.incorrect_count
    FROM words w
    INNER JOIN user_word_progress uwp ON w.id = uwp.word_id
    WHERE uwp.user_id = ${userId}
      AND uwp.next_review_date <= ?
      AND uwp.mastered = 0
    ORDER BY uwp.next_review_date ASC
    LIMIT 50
  `).all(today);

  res.json({ words, total: words.length });
});

module.exports = router;
