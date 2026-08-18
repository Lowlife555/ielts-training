const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { requireAuth } = require('../auth');
const { recordAnswer } = require('../services/wordProgress');

router.use(requireAuth);

// Get words for spelling test
router.get('/', (req, res) => {
  const db = getDb();
  const { topic, count = 20 } = req.query;

  let query = 'SELECT id, word, phonetic, chinese_definition, part_of_speech FROM words WHERE 1=1';
  const params = [];

  if (topic) {
    query += ' AND topic = ?';
    params.push(topic);
  }

  query += ' ORDER BY RANDOM() LIMIT ?';
  params.push(parseInt(count));

  const words = db.prepare(query).all(...params);

  // For spelling test, return chinese_definition as prompt and hide the word
  const testItems = words.map(w => ({
    id: w.id,
    prompt: w.chinese_definition,
    phonetic: w.phonetic,
    partOfSpeech: w.part_of_speech,
    answer: w.word,
  }));

  res.json({ words: testItems, total: testItems.length });
});

// Submit spelling test result
router.post('/', (req, res) => {
  const db = getDb();
  const { wordId, userAnswer, isCorrect } = req.body;

  if (!wordId) {
    return res.status(400).json({ error: 'wordId is required' });
  }

  const word = db.prepare('SELECT * FROM words WHERE id = ?').get(wordId);
  if (!word) {
    return res.status(404).json({ error: 'Word not found' });
  }

  const userId = req.user.id;

  // 统一走 wordProgress service（同时消除 ${userId} 字符串拼接）
  recordAnswer(db, userId, wordId, isCorrect);

  res.json({
    wordId,
    correct: isCorrect,
    correctAnswer: word.word,
  });
});

module.exports = router;
