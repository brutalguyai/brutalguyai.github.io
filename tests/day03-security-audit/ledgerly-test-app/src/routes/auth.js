const router = require('express').Router();
const db = require('../lib/db');
const { hashPassword, checkPassword, sign } = require('../lib/auth');

router.post('/register', (req, res) => {
  const { email, name, password, company } = req.body;
  if (!email || !password || password.length < 10) return res.status(400).json({ error: 'invalid' });
  const r = db.prepare('INSERT INTO users (email, name, password_hash, company) VALUES (?, ?, ?, ?)').run(email, name, hashPassword(password), company);
  res.json({ id: r.lastInsertRowid });
});

router.post('/login', (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(req.body.email);
  if (!u || !checkPassword(req.body.password || '', u.password_hash)) return res.status(401).json({ error: 'bad credentials' });
  res.json({ token: sign(u) });
});

module.exports = router;
