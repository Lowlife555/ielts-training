const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { requireAuth } = require('../auth');

router.use(requireAuth);

// Get unread announcements for the current user
router.get('/', (req, res) => {
  const db = getDb();
  const userId = req.user.id;

  const rows = db.prepare(`
    SELECT a.id, a.version, a.title, a.content
    FROM announcements a
    WHERE NOT EXISTS (
      SELECT 1 FROM user_announcements ua
      WHERE ua.announcement_id = a.id AND ua.user_id = ?
    )
    ORDER BY a.id ASC
  `).all(userId);

  res.json({ announcements: rows.map(r => ({ ...r, content: JSON.parse(r.content) })) });
});

// Mark an announcement as seen
router.post('/:id/seen', (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const id = Number(req.params.id);

  const exists = db.prepare('SELECT id FROM announcements WHERE id = ?').get(id);
  if (!exists) {
    return res.status(404).json({ error: 'Announcement not found' });
  }

  db.prepare(`
    INSERT INTO user_announcements (user_id, announcement_id)
    VALUES (?, ?)
    ON CONFLICT (user_id, announcement_id) DO NOTHING
  `).run(userId, id);

  res.json({ ok: true });
});

module.exports = router;
