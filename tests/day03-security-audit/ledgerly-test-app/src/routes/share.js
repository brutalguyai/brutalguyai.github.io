const router = require('express').Router();
const db = require('../lib/db');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Public, read-only invoice page sent to the customer
router.get('/i/:token', (req, res) => {
  const inv = db.prepare('SELECT * FROM invoices WHERE share_token = ?').get(String(req.params.token));
  if (!inv) return res.status(404).send('Not found');
  res.send(`<!doctype html><html><head><title>Invoice #${inv.id}</title></head><body>
  <h1>Invoice for ${esc(inv.customer)}</h1>
  <p>Amount: ${(inv.amount_cents / 100).toFixed(2)}</p>
  <div class="notes">${inv.notes}</div>
  </body></html>`);
});

module.exports = router;
