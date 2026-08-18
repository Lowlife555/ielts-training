const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { requireAuth } = require('../auth');

router.use(requireAuth);

// Get wrong words (words with incorrect_count > 0)
router.get('/', (req, res) => {
  const db = getDb();
  const userId = req.user.id;

  const words = db.prepare(`
    SELECT w.*, uwp.correct_count, uwp.incorrect_count, uwp.mastered
    FROM words w
    INNER JOIN user_word_progress uwp ON w.id = uwp.word_id
    WHERE uwp.user_id = ? AND uwp.incorrect_count > 0
    ORDER BY uwp.incorrect_count DESC, w.id
  `).all(userId);

  res.json({ words, total: words.length });
});

module.exports = router;
