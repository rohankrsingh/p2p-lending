import jwt from 'jsonwebtoken';

export const generateToken = (userId, role) =>
  jwt.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: '7d' });

export const protect = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
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
