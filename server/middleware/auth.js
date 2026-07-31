import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const generateToken = (userId, role) =>
  jwt.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Async so we can revalidate the user against the DB on every request.
// This ensures deleted users are rejected immediately and role changes
// take effect without waiting for the 7-day token to expire.
export const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  try {
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(payload.id);
    if (!user) {
      return res.status(401).json({ message: 'Account no longer exists' });
    }

    // Use the CURRENT role from the DB, not the token (roles can change)
    req.user = { id: user._id.toString(), role: user.role };
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    // DB hiccup — don't lock everyone out; fall back to token verification
    console.error('[Auth] protect middleware error:', err.message);
    return res.status(500).json({ message: 'Authentication unavailable' });
  }
};

export const requireRole = (role) => (req, res, next) => {
  if (req.user?.role !== role) {
    return res
      .status(403)
      .json({ message: `Access restricted to ${role}s only` });
  }
  next();
};
