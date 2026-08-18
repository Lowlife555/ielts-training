const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { createRateLimiter } = require('./rateLimit');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// 收敛 CORS：仅允许同源请求与本地开发来源，拒绝任意第三方站点
function isAllowedOrigin(origin) {
  if (!origin) return true; // 同源 / curl / 服务端请求
  try {
    const hostname = new URL(origin).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}
app.use(cors({
  origin(origin, cb) {
    if (isAllowedOrigin(origin)) return cb(null, true);
    return cb(null, false);
  },
}));
app.use(express.json({ limit: '50mb' }));

// Rate limiting：敏感接口防暴力破解 / 刷 API
const authLoginLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 10, message: '登录尝试过于频繁，请稍后再试' });
const registerLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 5, message: '注册请求过于频繁，请稍后再试' });
const essaySubmitLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 10, message: '作文提交过于频繁，请稍后再试' });
app.use('/api/auth/login', authLoginLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/essays/submit', essaySubmitLimiter);

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/topics', require('./routes/topics'));
app.use('/api/words', require('./routes/words'));
app.use('/api/spelling-test', require('./routes/spellingTest'));
app.use('/api/meaning-test', require('./routes/meaningTest'));
app.use('/api/lists', require('./routes/lists'));
app.use('/api/review-words', require('./routes/reviewWords'));
app.use('/api/review-result', require('./routes/reviewResult'));
app.use('/api/wrong-words', require('./routes/wrongWords'));
app.use('/api/writing-questions', require('./routes/writingQuestions'));
app.use('/api/essays', require('./routes/essays'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/daily', require('./routes/daily'));
app.use('/api/daily-plan', require('./routes/dailyPlan'));
app.use('/api/training', require('./routes/training'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/user-kv', require('./routes/userKv'));
app.use('/api/trace', require('./routes/trace'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
