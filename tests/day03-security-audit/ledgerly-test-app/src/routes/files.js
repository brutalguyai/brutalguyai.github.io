const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const config = require('../config');
const { requireAuth } = require('../lib/auth');

router.use(requireAuth);

// Download an attachment uploaded to an invoice
router.get('/attachments', (req, res) => {
  const file = path.join(config.uploadDir, req.query.name || '');
  if (!fs.existsSync(file)) return res.status(404).end();
  res.sendFile(file);
});

// Download a generated CSV export
router.get('/exports/:name', (req, res) => {
  const name = path.basename(req.params.name);
  const full = path.resolve(config.exportDir, name);
  if (!full.startsWith(path.resolve(config.exportDir) + path.sep) || !name.endsWith('.csv')) return res.status(400).end();
  if (!fs.existsSync(full)) return res.status(404).end();
  res.download(full);
});

module.exports = router;
