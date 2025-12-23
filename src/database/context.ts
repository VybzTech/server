//  import { Request, Response } from 'express';
// import { verifySupabaseJWT, extractTokenFromHeader } from '../auth/jwt';
// import { prisma } from '../database/client';

// export async function createContext({
//   req,
//   res,
// }: {
//   req: Request;
//   res: Response;
// }) {
//   const authHeader = req.headers.authorization;
//   let user = null;
//   let token = null;

//   if (authHeader) {
//     token = extractTokenFromHeader(authHeader);
//     if (token) {
//       const payload = verifySupabaseJWT(token);
//       if (payload) {
//         // Get full user object from database
//         user = await prisma.user.findUnique({
//           where: { supabaseUserId: payload.sub },
//         });
//       }
//     }
//   }

//   return {
//     req,
//     res,
//     user,
//     token,
//     prisma,
//   };
// }

// export type Context = Awaited<ReturnType<typeof createContext>>;

import type { IncomingMessage, ServerResponse } from "http";
import { prisma } from "./client.js";
import { verifyToken } from "../lib/jwt.js";

export interface Context {
  prisma: typeof prisma;
  userId?: string;
  user?: any;
  token?: string;
  req?: IncomingMessage;
  res?: ServerResponse;
}

export async function createContext({
  req,
  res,
}: {
  req?: IncomingMessage;
  res?: ServerResponse;
}): Promise<Context> {
  const authHeader = req?.headers.authorization;
  let userId: string | undefined;
  let user: any;
  let token: string | undefined;

  console.log("[Context] Building context...");

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);

    try {
      const decoded = verifyToken(token);
      userId = decoded?.sub;
      // userId = decoded?.userId;

      user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          tenantProfile: true,
          landlordProfile: true,
          agentProfile: true,
          officerProfile: true,
        },
      });

      console.log("[Context] ✅ Token verified", { userId });
    } catch (error) {
      console.warn(
        "[Context] ⚠️  Invalid token:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  return {
    prisma,
    userId,
    user,
    token,
    req,
    res,
  };  
}
