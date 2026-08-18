const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { requireAuth } = require('../auth');

router.use(requireAuth);

// Get words by topic with pagination
router.get('/', (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const { topic, page = 1, limit = 20, search } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = `SELECT w.*, uwp.mastered, uwp.correct_count, uwp.incorrect_count FROM words w LEFT JOIN user_word_progress uwp ON w.id = uwp.word_id AND uwp.user_id = ? WHERE 1=1`;
  let countQuery = 'SELECT COUNT(*) as total FROM words w WHERE 1=1';
  const params = [userId];
  const countParams = [];

  if (topic) {
    query += ' AND w.topic = ?';
    countQuery += ' AND w.topic = ?';
    params.push(topic);
    countParams.push(topic);
  }

  if (search) {
    query += ' AND (w.word LIKE ? OR w.chinese_definition LIKE ?)';
    countQuery += ' AND (w.word LIKE ? OR w.chinese_definition LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
    countParams.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY w.id LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  const words = db.prepare(query).all(...params);
  const { total } = db.prepare(countQuery).get(...countParams);

  res.json({
    words,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  });
});

// Get single word by ID
router.get('/:id', (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const word = db.prepare(`
    SELECT w.*, uwp.mastered, uwp.correct_count, uwp.incorrect_count,
           uwp.ease_factor, uwp.interval_days, uwp.repetitions
    FROM words w
    LEFT JOIN user_word_progress uwp ON w.id = uwp.word_id AND uwp.user_id = ?
    WHERE w.id = ?
  `).get(userId, req.params.id);

  if (!word) {
    return res.status(404).json({ error: 'Word not found' });
  }

  res.json(word);
});

module.exports = router;
