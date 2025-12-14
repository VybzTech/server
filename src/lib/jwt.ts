// (JWT token handling)
// ==========================================

import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function createToken(userId: string): string {
  return jwt.sign(
    {
      sub: userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days
    },
    JWT_SECRET
  );
}

export function verifyToken(token: string): { sub: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded as { sub: string };
  } catch (err) {
    return null;
  }
}
