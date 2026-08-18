const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { requireAuth } = require('../auth');

router.use(requireAuth);

// Get essay history
router.get('/history', (req, res) => {
  const db = getDb();
  const userId = req.user.id;

  const submissions = db.prepare(`
    SELECT es.*, wq.question_text, wq.task_type, wq.source
    FROM essay_submissions es
    JOIN writing_questions wq ON es.question_id = wq.id
    WHERE es.user_id = ?
    ORDER BY es.submitted_at DESC
  `).all(userId);

  res.json({ submissions });
});

// Get essay result by ID
router.get('/:id/result', (req, res) => {
  const db = getDb();
  const userId = req.user.id;

  const submission = db.prepare(`
    SELECT es.*, wq.question_text, wq.task_type, wq.model_essay
    FROM essay_submissions es
    JOIN writing_questions wq ON es.question_id = wq.id
    WHERE es.id = ? AND es.user_id = ?
  `).get(req.params.id, userId);

  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  // Parse JSON fields
  if (submission.scores_json) {
    submission.scores = JSON.parse(submission.scores_json);
  }
  if (submission.feedback_json) {
    submission.feedback = JSON.parse(submission.feedback_json);
  }
  if (submission.corrections_json) {
    submission.corrections = JSON.parse(submission.corrections_json);
  }

  res.json(submission);
});

// Submit essay for grading
router.post('/submit', async (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const { questionId, essayText } = req.body;

  if (!questionId || !essayText) {
    return res.status(400).json({ error: 'questionId and essayText are required' });
  }

  if (essayText.trim().length < 20) {
    return res.status(400).json({ error: 'Essay is too short. Please write at least 20 characters.' });
  }

  const question = db.prepare('SELECT * FROM writing_questions WHERE id = ?').get(questionId);
  if (!question) {
    return res.status(404).json({ error: 'Question not found' });
  }

  // Count words
  const wordCount = essayText.trim().split(/\s+/).length;

  // Create submission record
  const result = db.prepare(`
    INSERT INTO essay_submissions (user_id, question_id, essay_text, word_count, grading_status)
    VALUES (?, ?, ?, ?, 'processing')
  `).run(userId, questionId, essayText, wordCount);

  const submissionId = result.lastInsertRowid;

  // Call DeepSeek API for grading
  try {
    const gradingResult = await callDeepSeekAPI(question, essayText);

    // Update submission with results
    db.prepare(`
      UPDATE essay_submissions
      SET scores_json = ?, feedback_json = ?, corrections_json = ?, grading_status = 'completed'
      WHERE id = ?
    `).run(
      JSON.stringify(gradingResult.scores),
      JSON.stringify(gradingResult.feedback),
      JSON.stringify(gradingResult.corrections),
      submissionId
    );

    res.json({
      id: submissionId,
      gradingStatus: 'completed',
      scores: gradingResult.scores,
      feedback: gradingResult.feedback,
      corrections: gradingResult.corrections,
    });
  } catch (err) {
    console.error('DeepSeek API error:', err.message);

    // Update with error status
    db.prepare(`
      UPDATE essay_submissions SET grading_status = 'error' WHERE id = ?
    `).run(submissionId);

    // Return a fallback grading result
    const fallbackResult = generateFallbackGrading(essayText, question);
    db.prepare(`
      UPDATE essay_submissions
      SET scores_json = ?, feedback_json = ?, corrections_json = ?, grading_status = 'completed'
      WHERE id = ?
    `).run(
      JSON.stringify(fallbackResult.scores),
      JSON.stringify(fallbackResult.feedback),
      JSON.stringify(fallbackResult.corrections),
      submissionId
    );

    res.json({
      id: submissionId,
      gradingStatus: 'completed',
      scores: fallbackResult.scores,
      feedback: fallbackResult.feedback,
      corrections: fallbackResult.corrections,
      note: 'Graded with offline analysis (DeepSeek API unavailable)',
    });
  }
});

async function callDeepSeekAPI(question, essayText) {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey || apiKey === 'your-deepseek-api-key-here') {
    throw new Error('DEEPSEEK_API_KEY not configured');
  }

  const taskType = question.task_type === 'task1' ? 'Task 1' : 'Task 2';

  const prompt = `你是一名雅思前考官。请对以下雅思${taskType}作文进行批改，严格按四项标准分别评分（每项0-9分，0.5为一档），并给出总分（四项平均，四舍五入到0.5分）。

题目：${question.question_text}

学生作文：
${essayText}

请输出严格的JSON格式（不要有任何额外文字）：
{
  "scores": {
    "task_achievement": 6.5,
    "coherence_cohesion": 6.0,
    "lexical_resource": 5.5,
    "grammatical_range": 6.0,
    "overall": 6.0
  },
  "feedback": {
    "strengths": ["亮点1", "亮点2"],
    "weaknesses": ["不足1", "不足2"],
    "task_achievement_comment": "...",
    "coherence_cohesion_comment": "...",
    "lexical_resource_comment": "...",
    "grammatical_range_comment": "..."
  },
  "corrections": [
    {
      "original": "原文错误片段",
      "correction": "修改后文本",
      "explanation": "修改原因（中文）",
      "type": "grammar/vocabulary/coherence/task"
    }
  ]
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是一名专业的雅思前考官。请只返回JSON格式的批改结果，不要包含任何其他文字。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`DeepSeek API returned ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Try to parse JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from DeepSeek response');
    }

    return JSON.parse(jsonMatch[0]);
  } finally {
    clearTimeout(timeout);
  }
}

function generateFallbackGrading(essayText, question) {
  const wordCount = essayText.trim().split(/\s+/).length;
  const minWords = question.word_limit_min || 250;

  // Simple heuristic-based scoring
  const wordScore = Math.min(wordCount / minWords, 1.5);
  const baseScore = Math.min(wordScore * 5 + 1, 7);

  const scores = {
    task_achievement: Math.round((baseScore + Math.random() * 0.5) * 2) / 2,
    coherence_cohesion: Math.round((baseScore - 0.5 + Math.random()) * 2) / 2,
    lexical_resource: Math.round((baseScore - 0.5 + Math.random()) * 2) / 2,
    grammatical_range: Math.round((baseScore - 1 + Math.random() * 1.5) * 2) / 2,
  };

  scores.overall = Math.round(
    ((scores.task_achievement + scores.coherence_cohesion +
      scores.lexical_resource + scores.grammatical_range) / 4) * 2
  ) / 2;

  return {
    scores,
    feedback: {
      strengths: [
        'You have attempted to address the task requirements.',
        'Your essay shows awareness of the topic.',
      ],
      weaknesses: [
        'Consider developing your arguments with more specific examples.',
        'Work on varying your sentence structures for better flow.',
      ],
      task_achievement_comment: 'You have addressed the main points of the question but could develop your ideas more fully.',
      coherence_cohesion_comment: 'The essay has a basic structure but transitions between ideas could be smoother.',
      lexical_resource_comment: 'Your vocabulary is adequate for the task but try to use more precise and varied words.',
      grammatical_range_comment: 'Basic grammar is generally correct but more complex structures would improve your score.',
    },
    corrections: [
      {
        original: '(Sample correction)',
        correction: '(Suggested revision)',
        explanation: 'This is an offline assessment. Connect DeepSeek API for detailed corrections.',
        type: 'grammar',
      },
    ],
  };
}

module.exports = router;
