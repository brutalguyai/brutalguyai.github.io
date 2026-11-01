const router = require('express').Router();
const crypto = require('crypto');
const db = require('../lib/db');
const { requireAuth } = require('../lib/auth');

const SORTABLE = { date: 'created_at', amount: 'amount_cents', customer: 'customer' };

router.use(requireAuth);

router.get('/', (req, res) => {
  const col = SORTABLE[req.query.sort] || 'created_at';
  const dir = req.query.dir === 'asc' ? 'ASC' : 'DESC';
  const rows = db.prepare(`SELECT * FROM invoices WHERE owner_id = ? ORDER BY ${col} ${dir} LIMIT 100`).all(req.user.sub);
  res.json(rows);
});

router.get('/search', (req, res) => {
  const q = req.query.q || '';
  const rows = db.prepare(`SELECT * FROM invoices WHERE owner_id = ${req.user.sub} AND customer LIKE '%${q}%'`).all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(Number(req.params.id));
  if (!inv) return res.status(404).json({ error: 'not found' });
  res.json(inv);
});

router.post('/', (req, res) => {
  const { customer, amount_cents, notes } = req.body;
  const r = db.prepare('INSERT INTO invoices (owner_id, customer, amount_cents, status, notes, share_token, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(req.user.sub, String(customer), Number(amount_cents) | 0, 'draft', String(notes || ''), crypto.randomBytes(24).toString('base64url'), new Date().toISOString());
  res.json({ id: r.lastInsertRowid });
});

router.delete('/:id', (req, res) => {
  const r = db.prepare('DELETE FROM invoices WHERE id = ? AND owner_id = ?').run(Number(req.params.id), req.user.sub);
  res.json({ deleted: r.changes });
});

module.exports = router;
