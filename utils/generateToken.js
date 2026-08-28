import jwt from 'jsonwebtoken';

export const generateToken = (userId, role) => {
  const secret = process.env.JWT_SECRET || 'fallback_secret_key_for_development';
  return jwt.sign({ id: userId, role }, secret, {
    expiresIn: '30d',
  });
};
