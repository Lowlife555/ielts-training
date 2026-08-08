const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { requireAuth } = require('../auth');

router.use(requireAuth);

const MAX_OPTIONS = 4;

function pickRandom(list, n, exclude) {
  const pool = list.filter(x => x !== exclude);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

function meaningText(meanings) {
  return meanings.join('；');
}

// GET /api/meaning-test?mode=meaning|mixed&topic=&count=20
router.get('/', (req, res) => {
  const db = getDb();
  const { topic, count = 20 } = req.query;
  const mode = req.query.mode === 'mixed' ? 'mixed' : 'meaning';
  const total = Math.min(Math.max(parseInt(count) || 20, 4), 60);

  let query = `
    SELECT w.id, w.word, w.phonetic, w.part_of_speech, w.chinese_definition,
           wm.meanings, wm.keywords
    FROM words w
    JOIN word_meanings wm ON wm.word_id = w.id
    WHERE w.is_extra = 0
  `;
  const params = [];
  if (topic) {
    query += ' AND w.topic = ?';
    params.push(topic);
  }

  const pool = db.prepare(query).all(...params);
  if (pool.length < 2) {
    return res.status(404).json({ error: '题库不足，请更换话题或稍后再试' });
  }

  const items = [];
  if (mode === 'mixed') {
    const half = Math.ceil(total / 2);
    const meaningPool = pickRandom(pool.map(w => w.id), half);
    const spellingPool = pickRandom(pool.map(w => w.id), total - half, null);
    const poolMap = new Map(pool.map(w => [w.id, w]));
    const mSet = new Set(meaningPool);
    const sSet = new Set(spellingPool);
    const mWords = [...mSet].map(id => poolMap.get(id));
    const sWords = [...sSet].map(id => poolMap.get(id));

    for (let i = 0; i < Math.max(mWords.length, sWords.length); i++) {
      if (i < mWords.length) items.push(buildMeaningItem(mWords[i], pool, db));
      if (i < sWords.length) items.push(buildSpellingItem(sWords[i]));
    }
  } else {
    const chosen = pickRandom(pool.map(w => w.id), total);
    const poolMap = new Map(pool.map(w => [w.id, w]));
    for (const id of chosen) items.push(buildMeaningItem(poolMap.get(id), pool, db));
  }

  res.json({ words: items, total: items.length, mode });
});

function buildMeaningItem(target, pool, db) {
  let meanings;
  try { meanings = JSON.parse(target.meanings); } catch { meanings = [target.chinese_definition]; }
  if (!Array.isArray(meanings) || meanings.length === 0) meanings = [target.chinese_definition];

  let distractorIds;
  if (target.topic) {
    const sameTopic = pool.filter(w => w.id !== target.id && w.topic === target.topic);
    distractorIds = pickRandom(sameTopic.map(w => w.id), MAX_OPTIONS - 1);
    if (distractorIds.length < MAX_OPTIONS - 1) {
      distractorIds = distractorIds.concat(
        pickRandom(pool.filter(w => w.id !== target.id && !distractorIds.includes(w.id)).map(w => w.id), MAX_OPTIONS - 1 - distractorIds.length)
      );
    }
  } else {
    distractorIds = pickRandom(pool.filter(w => w.id !== target.id).map(w => w.id), MAX_OPTIONS - 1);
  }

  const poolMap = new Map(pool.map(w => [w.id, w]));
  const options = [{ id: target.id, text: meaningText(meanings), isCorrect: true }];
  for (const did of distractorIds) {
    const d = poolMap.get(did);
    if (!d) continue;
    let dm;
    try { dm = JSON.parse(d.meanings); } catch { dm = [d.chinese_definition]; }
    if (!Array.isArray(dm) || dm.length === 0) dm = [d.chinese_definition];
    options.push({ id: d.id, text: meaningText(dm), isCorrect: false });
  }

  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return {
    type: 'meaning',
    id: target.id,
    word: target.word,
    phonetic: target.phonetic,
    partOfSpeech: target.part_of_speech,
    options: options.map(o => ({ id: o.id, text: o.text })),
    correctOptionId: target.id,
  };
}

function buildSpellingItem(word) {
  return {
    type: 'spelling',
    id: word.id,
    prompt: word.chinese_definition,
    phonetic: word.phonetic,
    partOfSpeech: word.part_of_speech,
    answer: word.word,
  };
}

// POST /api/meaning-test
// { wordId, type: 'meaning'|'spelling', isCorrect, userAnswer?, selectedOptionId? }
router.post('/', (req, res) => {
  const db = getDb();
  const { wordId, type = 'meaning', isCorrect, userAnswer, selectedOptionId } = req.body;

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
    type,
    correct: isCorrect,
    correctAnswer: word.word,
  });
});

module.exports = router;
