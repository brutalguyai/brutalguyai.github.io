const { DatabaseSync } = require('node:sqlite');
const config = require('../config');
const db = new DatabaseSync(config.dbFile);
db.exec(`
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT UNIQUE, name TEXT, password_hash TEXT, role TEXT DEFAULT 'member', company TEXT);
CREATE TABLE IF NOT EXISTS invoices (id INTEGER PRIMARY KEY, owner_id INTEGER, customer TEXT, amount_cents INTEGER, status TEXT, notes TEXT, share_token TEXT, created_at TEXT);
`);
module.exports = db;
