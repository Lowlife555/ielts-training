const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { requireAuth } = require('../auth');

router.use(requireAuth);

router.get('/', (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const topics = db.prepare(`
    SELECT
      topic,
      COUNT(*) as word_count,
      COUNT(DISTINCT CASE WHEN uwp.mastered = 1 THEN w.id END) as mastered_count
    FROM words w
    LEFT JOIN user_word_progress uwp ON w.id = uwp.word_id AND uwp.user_id = ${userId}
    GROUP BY topic
    ORDER BY topic
  `).all();

  const topicNames = {
    education: '教育',
    environment: '环境',
    technology: '科技',
    society: '社会',
    health: '健康',
    economy: '经济',
    culture: '文化',
    science: '科学',
  };

  const result = topics.map(t => ({
    topic: t.topic,
    name: topicNames[t.topic] || t.topic,
    wordCount: t.word_count,
    masteredCount: t.mastered_count || 0,
    progress: t.word_count > 0
      ? Math.round(((t.mastered_count || 0) / t.word_count) * 100)
      : 0,
  }));

  res.json(result);
});

module.exports = router;
