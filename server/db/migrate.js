const { getDb, closeDb } = require('./database');

function migrate() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL,
      phonetic TEXT,
      part_of_speech TEXT,
      chinese_definition TEXT NOT NULL,
      topic TEXT NOT NULL,
      level TEXT DEFAULT 'ielts',
      example_sentence TEXT,
      example_translation TEXT,
      difficulty_level INTEGER DEFAULT 1,
      source TEXT
    );

    CREATE TABLE IF NOT EXISTS user_word_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      word_id INTEGER NOT NULL,
      ease_factor REAL DEFAULT 2.5,
      interval_days INTEGER DEFAULT 1,
      repetitions INTEGER DEFAULT 0,
      next_review_date TEXT,
      last_review_date TEXT,
      correct_count INTEGER DEFAULT 0,
      incorrect_count INTEGER DEFAULT 0,
      mastered INTEGER DEFAULT 0,
      UNIQUE(user_id, word_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (word_id) REFERENCES words(id)
    );

    CREATE TABLE IF NOT EXISTS writing_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_text TEXT NOT NULL,
      task_type TEXT NOT NULL,
      chart_type TEXT,
      question_type TEXT,
      difficulty INTEGER DEFAULT 1,
      source TEXT,
      model_essay TEXT,
      word_limit_min INTEGER,
      word_limit_max INTEGER
    );

    CREATE TABLE IF NOT EXISTS essay_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      essay_text TEXT NOT NULL,
      word_count INTEGER,
      scores_json TEXT,
      feedback_json TEXT,
      corrections_json TEXT,
      submitted_at TEXT DEFAULT (datetime('now')),
      grading_status TEXT DEFAULT 'pending',
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (question_id) REFERENCES writing_questions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_words_topic ON words(topic);
    CREATE INDEX IF NOT EXISTS idx_words_difficulty ON words(difficulty_level);
    CREATE INDEX IF NOT EXISTS idx_words_level ON words(level);
    CREATE INDEX IF NOT EXISTS idx_user_word_progress_user ON user_word_progress(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_word_progress_review ON user_word_progress(next_review_date);
    CREATE INDEX IF NOT EXISTS idx_writing_questions_task ON writing_questions(task_type);
    CREATE INDEX IF NOT EXISTS idx_essay_submissions_user ON essay_submissions(user_id);

    CREATE TABLE IF NOT EXISTS daily_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_date TEXT DEFAULT (date('now')),
      level TEXT NOT NULL DEFAULT 'pet',
      word_count INTEGER NOT NULL DEFAULT 50,
      quiz_accuracy REAL,
      correction_accuracy REAL,
      status TEXT DEFAULT 'studying',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS daily_session_words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      word_id INTEGER NOT NULL,
      study_order INTEGER DEFAULT 0,
      quiz_correct INTEGER,
      quiz_answer TEXT,
      correction_correct INTEGER,
      correction_answer TEXT,
      times_correct INTEGER DEFAULT 0,
      times_incorrect INTEGER DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES daily_sessions(id),
      FOREIGN KEY (word_id) REFERENCES words(id)
    );

    CREATE INDEX IF NOT EXISTS idx_daily_sessions_user ON daily_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_daily_session_words_session ON daily_session_words(session_id);
  `);

  // Add level column if not exists (for databases created before this migration)
  try {
    db.exec("ALTER TABLE words ADD COLUMN level TEXT DEFAULT 'ielts'");
  } catch (e) {
    // Column already exists
  }

  // Insert default user if not exists
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    db.prepare('INSERT INTO users (username) VALUES (?)').run('default');
  }

  console.log('Database migration completed successfully.');
  closeDb();
}

migrate();
