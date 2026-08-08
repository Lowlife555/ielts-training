const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { requireAuth } = require('../auth');

router.use(requireAuth);

// GET /api/lists — 24 个 List 元数据 + 每 List 掌握进度
router.get('/', (req, res) => {
  const db = getDb();
  const userId = req.user.id;

  const lists = db.prepare(`
    SELECT
      w.list_no,
      COUNT(*) as word_count,
      COUNT(DISTINCT CASE WHEN uwp.mastered = 1 THEN w.id END) as mastered_count
    FROM words w
    LEFT JOIN user_word_progress uwp ON w.id = uwp.word_id AND uwp.user_id = ?
    WHERE w.is_extra = 0 AND w.list_no IS NOT NULL
    GROUP BY w.list_no
    ORDER BY w.list_no
  `).all(userId);

  res.json(lists.map(l => ({
    listNo: l.list_no,
    wordCount: l.word_count,
    masteredCount: l.mastered_count || 0,
    progress: l.word_count > 0
      ? Math.round(((l.mastered_count || 0) / l.word_count) * 100)
      : 0,
  })));
});

// GET /api/lists/:listNo/words — 该 List 全部词(含完整释义 + 判词关键词)
router.get('/:listNo/words', (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const listNo = parseInt(req.params.listNo);

  const words = db.prepare(`
    SELECT w.id, w.word, w.phonetic, w.part_of_speech, w.chinese_definition,
           wm.meanings, wm.keywords,
           uwp.mastered
    FROM words w
    LEFT JOIN word_meanings wm ON wm.word_id = w.id
    LEFT JOIN user_word_progress uwp ON w.id = uwp.word_id AND uwp.user_id = ?
    WHERE w.is_extra = 0 AND w.list_no = ?
    ORDER BY w.id
  `).all(userId, listNo);

  if (words.length === 0) {
    return res.status(404).json({ error: 'List 不存在或无单词' });
  }

  res.json({
    listNo,
    total: words.length,
    words: words.map(w => ({
      id: w.id,
      word: w.word,
      phonetic: w.phonetic,
      partOfSpeech: w.part_of_speech,
      chineseDefinition: w.chinese_definition,
      meanings: parseJson(w.meanings) || [w.chinese_definition],
      keywords: parseJson(w.keywords) || [],
      mastered: w.mastered || 0,
    })),
  });
});

// POST /api/lists/:listNo/dictation — 默写判分提交(写入 user_word_progress)
router.post('/:listNo/dictation', (req, res) => {
  const db = getDb();
  const { wordId, isCorrect, userAnswer } = req.body;

  if (!wordId) {
    return res.status(400).json({ error: 'wordId is required' });
  }

  const word = db.prepare('SELECT * FROM words WHERE id = ?').get(wordId);
  if (!word) {
    return res.status(404).json({ error: 'Word not found' });
  }

  const userId = req.user.id;
  const now = new Date().toISOString().split('T')[0];
  const existing = db.prepare(
    'SELECT * FROM user_word_progress WHERE user_id = ? AND word_id = ?'
  ).get(userId, wordId);

  const correct = isCorrect ? 1 : 0;
  const incorrect = isCorrect ? 0 : 1;

  if (existing) {
    const newCorrect = (existing.correct_count || 0) + correct;
    const newIncorrect = (existing.incorrect_count || 0) + incorrect;
    const mastered = newCorrect >= 3 ? 1 : 0;
    db.prepare(`
      UPDATE user_word_progress
      SET correct_count = ?, incorrect_count = ?, mastered = ?,
          last_review_date = ?, next_review_date = date('now', '+' || ? || ' days')
      WHERE user_id = ? AND word_id = ?
    `).run(newCorrect, newIncorrect, mastered, now, isCorrect ? 2 : 1, userId, wordId);
  } else {
    db.prepare(`
      INSERT INTO user_word_progress (user_id, word_id, correct_count, incorrect_count, mastered, last_review_date, next_review_date)
      VALUES (?, ?, ?, ?, ?, ?, date('now', '+' || ? || ' days'))
    `).run(userId, wordId, correct, incorrect, 0, now, isCorrect ? 2 : 1);
  }

  res.json({
    wordId,
    correct: isCorrect,
    correctAnswer: word.word,
  });
});

function parseJson(str) {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
}

module.exports = router;
