// Server/src/routes/health.ts
// (Pure Express route - NOT tRPC)
// ==========================================
import type { Request, Response } from 'express';
import { prisma } from '../database/client.js';
// import { redis } from '../lib/redis.js';

export async function healthCheckHandler(req: Request, res: Response) {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;

    // Check Redis
    // await redis.ping();

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected',
      },
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
} 