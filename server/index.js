const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

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
