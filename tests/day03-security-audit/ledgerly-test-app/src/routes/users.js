const router = require('express').Router();
const db = require('../lib/db');
const { requireAuth } = require('../lib/auth');

router.get('/me', requireAuth, (req, res) => {
  const u = db.prepare('SELECT id, email, name, role, company FROM users WHERE id = ?').get(req.user.sub);
  res.json(u);
});

// Update profile fields
router.patch('/me', requireAuth, (req, res) => {
  const fields = Object.keys(req.body).filter((k) => ['name', 'company', 'email', 'role'].includes(k));
  if (!fields.length) return res.status(400).json({ error: 'nothing to update' });
  const set = fields.map((f) => `${f} = ?`).join(', ');
  db.prepare(`UPDATE users SET ${set} WHERE id = ?`).run(...fields.map((f) => req.body[f]), req.user.sub);
  res.json(db.prepare('SELECT id, email, name, role, company FROM users WHERE id = ?').get(req.user.sub));
});

module.exports = router;
