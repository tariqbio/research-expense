const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  if (!token)  return res.status(401).json({ error: 'Malformed token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function adminOnly(req, res, next) {
  if (!['admin','superadmin'].includes(req.user?.role))
    return res.status(403).json({ error: 'Admin access required' });
  next();
}

function superOnly(req, res, next) {
  if (req.user?.role !== 'superadmin')
    return res.status(403).json({ error: 'Superadmin access required' });
  next();
}

module.exports = { authenticate, adminOnly, superOnly };
