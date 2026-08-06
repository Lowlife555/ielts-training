const express = require('express');
const router = express.Router();
const { getDb, getUserId } = require('../db/database');

// Get learning overview stats
router.get('/overview', (req, res) => {
  const db = getDb();
  const userId = getUserId();
  const today = new Date().toISOString().split('T')[0];

  const totalWords = db.prepare('SELECT COUNT(*) as count FROM words').get().count;
  const masteredWords = db.prepare(
    `SELECT COUNT(*) as count FROM user_word_progress WHERE user_id = ${userId} AND mastered = 1`
  ).get().count;
  const todayReview = db.prepare(
    `SELECT COUNT(*) as count FROM user_word_progress WHERE user_id = ${userId} AND next_review_date <= ? AND mastered = 0`
  ).get(today).count;
  const wrongWords = db.prepare(
    `SELECT COUNT(*) as count FROM user_word_progress WHERE user_id = ${userId} AND incorrect_count > 0`
  ).get().count;

  const totalEssays = db.prepare(
    `SELECT COUNT(*) as count FROM essay_submissions WHERE user_id = ${userId} AND grading_status = 'completed'`
  ).get().count;

  const avgScore = db.prepare(`
    SELECT AVG(
      CAST(json_extract(scores_json, '$.overall') AS REAL)
    ) as avg
    FROM essay_submissions
    WHERE user_id = ${userId} AND grading_status = 'completed' AND scores_json IS NOT NULL
  `).get();

  res.json({
    totalWords,
    masteredWords,
    todayReviewCount: todayReview,
    wrongWordsCount: wrongWords,
    totalEssays,
    averageEssayScore: avgScore.avg ? Math.round(avgScore.avg * 10) / 10 : null,
    todayProgress: {
      learned: db.prepare(
        `SELECT COUNT(*) as count FROM user_word_progress WHERE user_id = ${userId} AND last_review_date = ?`
      ).get(today).count,
    },
  });
});

module.exports = router;
