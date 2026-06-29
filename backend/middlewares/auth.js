const jwt = require('jsonwebtoken');
const db = require('../models');

exports.isAuthenticatedUser = (req, res, next) => {
  if (!req.header('Authorization')) {
    return res.status(401).json({ message: 'Login first to access this resource' });
  }
  const token = req.header('Authorization').split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Login first' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.body = req.body || {};
    req.body.user = { id: decoded.id };
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

exports.isAdmin = async (req, res, next) => {
  if (!req.header('Authorization')) {
    return res.status(401).json({ message: 'Login first' });
  }
  const token = req.header('Authorization').split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db.User.findByPk(decoded.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    req.body = req.body || {};
    req.body.user = { id: decoded.id, role: user.role };
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
