import jwt from 'jsonwebtoken';
import { env } from '../env';

export interface JWTPayload {
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  email?: string;
  phone?: string;
  [key: string]: any;
}

export function verifySupabaseJWT(token: string): JWTPayload | null {
  try {
    // Verify using Supabase JWT secret
    const payload = jwt.verify(token, env.SUPABASE_JWT_SECRET, {
      algorithms: ['HS256'],
    }) as JWTPayload;

    // Verify token hasn't expired
    if (payload.exp * 1000 < Date.now()) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

export function extractTokenFromHeader(authHeader: string): string | null {
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }
  return null;
}