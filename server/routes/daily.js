const express = require('express');
const router = express.Router();
const { getDb, getUserId } = require('../db/database');

// Start a new daily study session
router.get('/start', (req, res) => {
  const db = getDb();
  const userId = getUserId();
  const { count = 50, level = 'pet' } = req.query;
  const wordCount = Math.min(parseInt(count), 200);

  // Get random words for this level
  const words = db.prepare(`
    SELECT id, word, phonetic, part_of_speech, chinese_definition, topic, level,
           example_sentence, example_translation
    FROM words
    WHERE level = ? OR level = 'ielts'
    ORDER BY RANDOM()
    LIMIT ?
  `).all(level, wordCount);

  if (words.length === 0) {
    return res.status(404).json({ error: 'No words found for this level' });
  }

  // Create session
  const result = db.prepare(`
    INSERT INTO daily_sessions (user_id, level, word_count, status)
    VALUES (?, ?, ?, 'studying')
  `).run(userId, level, words.length);

  const sessionId = result.lastInsertRowid;

  // Insert session words
  const insertWord = db.prepare(`
    INSERT INTO daily_session_words (session_id, word_id, study_order)
    VALUES (?, ?, ?)
  `);

  const insertAll = db.transaction((items) => {
    items.forEach((w, i) => insertWord.run(sessionId, w.id, i + 1));
  });
  insertAll(words);

  // Return words without answers for study
  const studyWords = words.map((w, i) => ({
    order: i + 1,
    wordId: w.id,
    word: w.word,
    phonetic: w.phonetic,
    partOfSpeech: w.part_of_speech,
    chineseDefinition: w.chinese_definition,
    topic: w.topic,
    exampleSentence: w.example_sentence,
    exampleTranslation: w.example_translation,
  }));

  res.json({
    sessionId,
    total: words.length,
    level,
    words: studyWords,
  });
});

// Submit quiz answers
router.post('/quiz', (req, res) => {
  const db = getDb();
  const { sessionId, answers } = req.body;
  // answers: [{ wordId, userAnswer }]

  if (!sessionId || !answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'sessionId and answers array required' });
  }

  let correctCount = 0;
  const results = [];

  const updateWord = db.prepare(`
    UPDATE daily_session_words
    SET quiz_correct = ?, quiz_answer = ?,
        times_correct = times_correct + ?,
        times_incorrect = times_incorrect + ?
    WHERE session_id = ? AND word_id = ?
  `);

  const updateAll = db.transaction(() => {
    for (const a of answers) {
      const word = db.prepare('SELECT word FROM words WHERE id = ?').get(a.wordId);
      if (!word) continue;

      const isCorrect = a.userAnswer.trim().toLowerCase() === word.word.toLowerCase();
      if (isCorrect) correctCount++;

      updateWord.run(
        isCorrect ? 1 : 0,
        a.userAnswer.trim(),
        isCorrect ? 1 : 0,
        isCorrect ? 0 : 1,
        sessionId,
        a.wordId
      );

      results.push({
        wordId: a.wordId,
        correct: isCorrect,
        correctAnswer: word.word,
        userAnswer: a.userAnswer.trim(),
      });
    }
  });
  updateAll();

  const accuracy = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0;

  // Update session accuracy
  db.prepare(`
    UPDATE daily_sessions SET quiz_accuracy = ?, status = 'quiz_done' WHERE id = ?
  `).run(accuracy, sessionId);

  // Get wrong answers for correction round
  const wrongWords = results.filter(r => !r.correct);

  res.json({
    sessionId,
    total: answers.length,
    correct: correctCount,
    accuracy,
    results,
    wrongCount: wrongWords.length,
    wrongWords: wrongWords.map(w => ({
      wordId: w.wordId,
      userAnswer: w.userAnswer,
      correctAnswer: w.correctAnswer,
    })),
  });
});

// Submit error correction round
router.post('/correction', (req, res) => {
  const db = getDb();
  const { sessionId, answers } = req.body;

  if (!sessionId || !answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'sessionId and answers array required' });
  }

  let correctCount = 0;
  const results = [];

  const updateWord = db.prepare(`
    UPDATE daily_session_words
    SET correction_correct = ?, correction_answer = ?,
        times_correct = times_correct + ?,
        times_incorrect = times_incorrect + ?
    WHERE session_id = ? AND word_id = ?
  `);

  const updateAll = db.transaction(() => {
    for (const a of answers) {
      const word = db.prepare('SELECT word FROM words WHERE id = ?').get(a.wordId);
      if (!word) continue;

      const isCorrect = a.userAnswer.trim().toLowerCase() === word.word.toLowerCase();
      if (isCorrect) correctCount++;

      updateWord.run(
        isCorrect ? 1 : 0,
        a.userAnswer.trim(),
        isCorrect ? 1 : 0,
        isCorrect ? 0 : 1,
        sessionId,
        a.wordId
      );

      results.push({
        wordId: a.wordId,
        correct: isCorrect,
        correctAnswer: word.word,
        userAnswer: a.userAnswer.trim(),
      });
    }
  });
  updateAll();

  const accuracy = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0;

  db.prepare(`
    UPDATE daily_sessions SET correction_accuracy = ?, status = 'completed' WHERE id = ?
  `).run(accuracy, sessionId);

  res.json({
    sessionId,
    total: answers.length,
    correct: correctCount,
    accuracy,
    results,
  });
});

// Get session report
router.get('/report/:sessionId', (req, res) => {
  const db = getDb();

  const session = db.prepare(`
    SELECT * FROM daily_sessions WHERE id = ?
  `).get(req.params.sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const words = db.prepare(`
    SELECT dsw.*, w.word, w.phonetic, w.part_of_speech, w.chinese_definition, w.topic
    FROM daily_session_words dsw
    JOIN words w ON dsw.word_id = w.id
    WHERE dsw.session_id = ?
    ORDER BY dsw.study_order
  `).all(req.params.sessionId);

  // Build consolidation table
  const quizWrong = words.filter(w => w.quiz_correct === 0);
  const correctionWrong = words.filter(w => w.correction_correct === 0);

  // Words that need most practice (wrong in both rounds)
  const needsPractice = words.filter(w =>
    w.quiz_correct === 0 && (w.correction_correct === null || w.correction_correct === 0)
  );

  res.json({
    session: {
      id: session.id,
      date: session.session_date,
      level: session.level,
      wordCount: session.word_count,
      quizAccuracy: session.quiz_accuracy,
      correctionAccuracy: session.correction_accuracy,
      status: session.status,
    },
    summary: {
      totalWords: words.length,
      quizCorrect: words.filter(w => w.quiz_correct === 1).length,
      quizWrong: quizWrong.length,
      correctionDone: words.filter(w => w.correction_correct !== null).length,
      correctionCorrect: words.filter(w => w.correction_correct === 1).length,
      needsPractice: needsPractice.length,
    },
    consolidationTable: needsPractice.map(w => ({
      wordId: w.word_id,
      word: w.word,
      phonetic: w.phonetic,
      partOfSpeech: w.part_of_speech,
      chineseDefinition: w.chinese_definition,
      topic: w.topic,
      quizAnswer: w.quiz_answer,
      correctionAnswer: w.correction_answer,
      timesCorrect: w.times_correct,
      timesIncorrect: w.times_incorrect,
    })),
    allWords: words.map(w => ({
      wordId: w.word_id,
      word: w.word,
      chineseDefinition: w.chinese_definition,
      partOfSpeech: w.part_of_speech,
      topic: w.topic,
      quizCorrect: w.quiz_correct === 1,
      quizAnswer: w.quiz_answer,
      correctionCorrect: w.correction_correct === 1,
      correctionAnswer: w.correction_answer,
      timesCorrect: w.times_correct,
      timesIncorrect: w.times_incorrect,
    })),
  });
});

// Get recent sessions list
router.get('/history', (req, res) => {
  const db = getDb();
  const userId = getUserId();

  const sessions = db.prepare(`
    SELECT * FROM daily_sessions
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 30
  `).all(userId);

  res.json({ sessions });
});

module.exports = router;
