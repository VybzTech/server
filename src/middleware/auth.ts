// import { Request, Response, NextFunction } from 'express';
// import { verifySupabaseJWT, extractTokenFromHeader } from '../auth/jwt';
// import { syncSupabaseUser } from '../auth/sync';

// declare global {
//   namespace Express {
//     interface Request {
//       user?: {
//         supabaseUserId: string;
//         email?: string;
//         phone?: string;
//       };
//       token?: string;
//     }
//   }
// }

// export async function authMiddleware(
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) {
//   const authHeader = req.headers.authorization;

//   if (!authHeader) {
//     return res.status(401).json({ error: 'Missing authorization header' });
//   }

//   const token = extractTokenFromHeader(authHeader);
//   if (!token) {
//     return res.status(401).json({ error: 'Invalid token format' });
//   }

//   const payload = verifySupabaseJWT(token);
//   if (!payload) {
//     return res.status(401).json({ error: 'Invalid or expired token' });
//   }

//   // Sync user to database (creates or updates)
//   try {
//     await syncSupabaseUser(payload, 'email');
//   } catch (error) {
//     console.error('Failed to sync user:', error);
//     // Continue anyway - user might already exist
//   }

//   req.user = {
//     supabaseUserId: payload.sub,
//     email: payload.email,
//     phone: payload.phone,
//   };
//   req.token = token;

//   next();
// }

// export async function optionalAuthMiddleware(
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) {
//   const authHeader = req.headers.authorization;

//   if (!authHeader) {
//     return next();
//   }

//   const token = extractTokenFromHeader(authHeader);
//   if (!token) {
//     return next();
//   }

//   const payload = verifySupabaseJWT(token);
//   if (payload) {
//     req.user = {
//       supabaseUserId: payload.sub,
//       email: payload.email,
//       phone: payload.phone,
//     };
//     req.token = token;
//   }

//   next();
// }


import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt.js";
import { prisma } from "../database/client.js";

export interface AuthRequest extends Request {
  userId?: string;
  user?: any;
  token?: string;
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Missing or invalid authorization header",
      });
    }

    const token = authHeader.slice(7);

    try {
      const decoded = verifyToken(token);
      req.userId = decoded?.userId;
      req.token = token;

      // Fetch full user
      const user = await prisma.user.findUnique({
        where: { id: decoded?.userId },
        include: {
          tenantProfile: true,
          landlordProfile: true,
          agentProfile: true,
          officerProfile: true,
        },
      });

      if (!user) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "User not found",
        });
      }

      if (user.isBlocked) {
        return res.status(403).json({
          error: "Forbidden",
          message: `Account blocked. Reason: ${user.blockReason || "Security reasons"}`,
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid token",
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}