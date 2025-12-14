// import type { Request } from 'express';
// import { verifyToken } from '../lib/jwt.js';
// import { prisma } from './client.js';
// // import { redis } from '../lib/redis.js';

// export async function createContext(opts: {
//   req: Request;
//   res: any;
// }) {
//   let userId: string | undefined;

//   // Try JWT from Authorization header (mobile)
//   if (opts.req.headers.authorization) {
//     const authHeader = opts.req.headers.authorization;
//     if (authHeader.startsWith('Bearer ')) {
//       const token = authHeader.substring(7);
//       const decoded = verifyToken(token);
//       if (decoded) {
//         userId = decoded.sub;
//       }
//     }
//   }

//   // Try Clerk JWT (future)
//   // Could verify Clerk token here

//   return {
//     userId,
//     prisma,
//     // redis,
//     req: opts.req,
//   };
// }

// export type Context = Awaited<ReturnType<typeof createContext>>;




import { Request, Response } from 'express';
import { verifySupabaseJWT, extractTokenFromHeader } from '../auth/jwt';
import { prisma } from '../database/client';

export async function createContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}) {
  const authHeader = req.headers.authorization;
  let user = null;
  let token = null;

  if (authHeader) {
    token = extractTokenFromHeader(authHeader);
    if (token) {
      const payload = verifySupabaseJWT(token);
      if (payload) {
        // Get full user object from database
        user = await prisma.user.findUnique({
          where: { supabaseUserId: payload.sub },
        });
      }
    }
  }

  return {
    req,
    res,
    user,
    token,
    prisma,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;