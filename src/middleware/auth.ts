import { Request, Response, NextFunction } from 'express';
import { verifySupabaseJWT, extractTokenFromHeader } from '../auth/jwt';
import { syncSupabaseUser } from '../auth/sync';

declare global {
  namespace Express {
    interface Request {
      user?: {
        supabaseUserId: string;
        email?: string;
        phone?: string;
      };
      token?: string;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = extractTokenFromHeader(authHeader);
  if (!token) {
    return res.status(401).json({ error: 'Invalid token format' });
  }

  const payload = verifySupabaseJWT(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Sync user to database (creates or updates)
  try {
    await syncSupabaseUser(payload, 'email');
  } catch (error) {
    console.error('Failed to sync user:', error);
    // Continue anyway - user might already exist
  }

  req.user = {
    supabaseUserId: payload.sub,
    email: payload.email,
    phone: payload.phone,
  };
  req.token = token;

  next();
}

export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  const token = extractTokenFromHeader(authHeader);
  if (!token) {
    return next();
  }

  const payload = verifySupabaseJWT(token);
  if (payload) {
    req.user = {
      supabaseUserId: payload.sub,
      email: payload.email,
      phone: payload.phone,
    };
    req.token = token;
  }

  next();
}