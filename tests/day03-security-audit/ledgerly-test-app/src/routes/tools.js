const router = require('express').Router();
const { exec, execFile } = require('child_process');
const config = require('../config');
const { requireAuth, requireAdmin } = require('../lib/auth');

router.use(requireAuth);

// Fetch a link preview (title) for a URL pasted into invoice notes
router.get('/preview', async (req, res) => {
  try {
    const r = await fetch(req.query.url, { redirect: 'follow' });
    const html = await r.text();
    const m = html.match(/<title>([^<]*)<\/title>/i);
    res.json({ title: m ? m[1] : null, status: r.status });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// Admin: check that the mail relay host is reachable
router.post('/diagnostics/ping', requireAdmin, (req, res) => {
  exec(`ping -c 1 ${req.body.host}`, { timeout: 5000 }, (err, out) => res.json({ ok: !err, out }));
});

// Admin: show git revision of the running build
const ALLOWED_GIT = { rev: ['rev-parse', 'HEAD'], branch: ['rev-parse', '--abbrev-ref', 'HEAD'] };
router.get('/diagnostics/git', requireAdmin, (req, res) => {
  const args = ALLOWED_GIT[req.query.what];
  if (!args) return res.status(400).json({ error: 'unknown' });
  execFile('git', args, { timeout: 3000 }, (err, out) => res.json({ ok: !err, out: String(out).trim() }));
});

// Upstream status for the dashboard banner
router.get('/status', async (req, res) => {
  try {
    const r = await fetch(config.statusPageUrl);
    res.json(await r.json());
  } catch {
    res.json({ status: 'unknown' });
  }
});

module.exports = router;
