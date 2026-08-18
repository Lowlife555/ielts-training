const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { requireAuth } = require('../auth');
const { recordAnswer } = require('../services/wordProgress');

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
           wm.meanings, wm.keywords, wm.synonyms,
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
      synonyms: parseJson(w.synonyms) || [],
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
  recordAnswer(db, userId, wordId, isCorrect);

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
