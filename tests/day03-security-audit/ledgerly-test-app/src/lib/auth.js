const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');

function hashPassword(pw, salt = crypto.randomBytes(16).toString('hex')) {
  const h = crypto.scryptSync(pw, salt, 32).toString('hex');
  return `${salt}:${h}`;
}
function checkPassword(pw, stored) {
  const [salt, h] = stored.split(':');
  const a = Buffer.from(crypto.scryptSync(pw, salt, 32).toString('hex'));
  return crypto.timingSafeEqual(a, Buffer.from(h));
}
function sign(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: '8h', algorithm: 'HS256' });
}
function requireAuth(req, res, next) {
  const t = (req.headers.authorization || '').replace(/^Bearer /, '');
  try {
    req.user = jwt.verify(t, config.jwtSecret, { algorithms: ['HS256'] });
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  next();
}
module.exports = { hashPassword, checkPassword, sign, requireAuth, requireAdmin };
