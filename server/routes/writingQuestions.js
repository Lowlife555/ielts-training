const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// Get writing questions with optional filters
router.get('/', (req, res) => {
  const db = getDb();
  const { task_type, difficulty } = req.query;

  let query = 'SELECT * FROM writing_questions WHERE 1=1';
  const params = [];

  if (task_type) {
    query += ' AND task_type = ?';
    params.push(task_type);
  }

  if (difficulty) {
    query += ' AND difficulty = ?';
    params.push(parseInt(difficulty));
  }

  query += ' ORDER BY id';

  const questions = db.prepare(query).all(...params);

  res.json({ questions, total: questions.length });
});

// Get single writing question
router.get('/:id', (req, res) => {
  const db = getDb();
  const question = db.prepare('SELECT * FROM writing_questions WHERE id = ?').get(req.params.id);

  if (!question) {
    return res.status(404).json({ error: 'Question not found' });
  }

  res.json(question);
});

module.exports = router;
