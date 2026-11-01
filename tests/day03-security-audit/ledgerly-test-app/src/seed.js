const db = require('./lib/db');
const { hashPassword } = require('./lib/auth');
const crypto = require('crypto');
const pw = () => process.env.SEED_PASSWORD || crypto.randomBytes(12).toString('base64url');
db.prepare("INSERT OR IGNORE INTO users (id, email, name, password_hash, role, company) VALUES (1, 'admin@ledgerly.example', 'Admin', ?, 'admin', 'Ledgerly')").run(hashPassword(pw()));
db.prepare("INSERT OR IGNORE INTO users (id, email, name, password_hash, role, company) VALUES (2, 'maya@bakery.example', 'Maya', ?, 'member', 'Maya Bakes')").run(hashPassword(pw()));
db.prepare("INSERT OR IGNORE INTO invoices (id, owner_id, customer, amount_cents, status, notes, share_token, created_at) VALUES (1, 2, 'Cafe Nord', 48000, 'sent', 'Thanks!', 'q8Zr2nVd0pW5sYb1LmT4xKc9', '2024-05-01')").run();
console.log('seeded');
