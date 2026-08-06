const express = require('express');
const router = express.Router();
const { getDb, getUserId } = require('../db/database');

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

  const userId = getUserId();

  // Update or insert progress
  const existing = db.prepare(
    `SELECT * FROM user_word_progress WHERE user_id = ${userId} AND word_id = ?`
  ).get(wordId);

  const now = new Date().toISOString().split('T')[0];

  if (existing) {
    const newCorrect = (existing.correct_count || 0) + (isCorrect ? 1 : 0);
    const newIncorrect = (existing.incorrect_count || 0) + (isCorrect ? 0 : 1);
    const mastered = newCorrect >= 3 ? 1 : 0;

    db.prepare(`
      UPDATE user_word_progress
      SET correct_count = ?, incorrect_count = ?, mastered = ?,
          last_review_date = ?, next_review_date = date('now', '+' || ? || ' days')
      WHERE user_id = ${userId} AND word_id = ?
    `).run(newCorrect, newIncorrect, mastered, now, isCorrect ? 2 : 1, wordId);
  } else {
    db.prepare(`
      INSERT INTO user_word_progress (user_id, word_id, correct_count, incorrect_count, mastered, last_review_date, next_review_date)
      VALUES (${userId}, ?, ?, ?, ?, ?, date('now', '+' || ? || ' days'))
    `).run(wordId, isCorrect ? 1 : 0, isCorrect ? 0 : 1, 0, now, isCorrect ? 2 : 1);
  }

  res.json({
    wordId,
    correct: isCorrect,
    correctAnswer: word.word,
  });
});

module.exports = router;
