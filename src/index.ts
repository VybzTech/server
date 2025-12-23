//  server/src/index.ts
import express from "express";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import dotenv from "dotenv";
import { appRouter } from "./database/routers";
import { createContext } from "./database/context.js";
import { healthCheckHandler } from "./routes/health.js";
import morgan from "morgan";
import { prisma } from "./database/client";
import { logger } from "./lib/logger";

// Load environment variables
dotenv.config({ path: ".env.local" });

// Add your required vars
const requiredEnvVars = ["DATABASE_URL", "STRIPE_SECRET_KEY"];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// CORS - filter out undefined values
const allowedOrigins = [
  "http://localhost:3000", // Web
  "http://localhost:8081", // Expo iOS
  "http://localhost:19000", // Expo
  "http://192.168.1.*", // Local network
  process.env.MOBILE_URL,
  process.env.WEB_URL,
].filter(Boolean); // Remove undefined values

// MIDDLEWARES
// ==========================================
// app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(morgan("dev"));
// app.use(clerkMiddleware());

app.use(express.json());

// DATABASE CONNECTION CHECK
// ==========================================
async function checkDatabaseConnection() {
  try {
    logger.info("🔍 Checking database connection...");

    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    logger.success("✅ Database connected successfully");

    // Get list of tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    logger.info("📊 Available database tables:");
    (tables as Array<{ table_name: string }>).forEach((t) => {
      logger.info(`   - ${t.table_name}`);
    });

    return true;
  } catch (error) {
    logger.error("❌ Database connection failed:", error);
    return false;
  }
}

// ROUTES
// ==========================================

app.get("/api/db-status", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "connected",
      message: "Database is connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("DB status check failed:", error);
    res.status(500).json({
      status: "disconnected",
      message: "Database connection failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Health check
app.get("/api/health", healthCheckHandler);
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});
/**
 * POST /api/auth/create-user
 * Called after Clerk signup to create user in database
 *
 * Body:
 * {
 *   clerkId: string,
 *   email: string,
 *   firstName: string,
 *   lastName: string,
 *   roles: string[] // ['TENANT'] or ['LANDLORD']
 * }
 */
// app.post("/api/auth/create-user", createUserHandler);

// Add this BEFORE the tRPC middleware
app.get("/api/trpc-test", async (req, res) => {
  try {
    // This simulates a tRPC call
    const caller = appRouter.createCaller(await createContext({ req, res }));

    res.json({
      success: true,
      message: "tRPC is working",
      availableRoutes: Object.keys(appRouter._def.procedures),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// tRPC routes
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError({ error, type, path }) {
      console.error(`[tRPC] ${type} on ${path}:`, error);
      logger.error(`❌ tRPC Error at ${path}:`, error.message);
      if (process.env.NODE_ENV === "production") {
        // Send to error tracking (Sentry, DataDog, etc)
      }
      if (error.cause) {
        logger.error("Cause:", error.cause);
      }
    },
  })
);

// Webhooks (Express - NOT tRPC)
// app.post('/api/webhooks/stripe', stripeWebhookHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    path: req.path,
  });
});
// app.use(errorHandler);

// ERROR HANDLER
// ==========================================
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Error:", err);
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
);

// START SERVER
// ==========================================
// app.listen(PORT, () => {
//   console.log(`✅ Server running on http://localhost:${PORT}`);
//   console.log(
//     `📡 tRPC endpoint: http://localhost:${PORT}/api/trpc or http://localhost:${PORT}/api/trpc-test/`
//   );
//   console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
//   console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
// });

async function startServer() {
  try {
    // Check database first
    const dbConnected = await checkDatabaseConnection();

    if (!dbConnected) {
      logger.error("🛑 Server startup aborted: Database not connected");
      process.exit(1);
    }

    app.listen(PORT, () => {
      logger.success(`\n🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📍 tRPC endpoint: http://localhost:${PORT}/trpc`);
      logger.info(`❤️  Health check: http://localhost:${PORT}/health`);
      logger.info(`📊 DB status: http://localhost:${PORT}/api/db-status\n`);
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      logger.info("\n🛑 Shutting down gracefully...");
      await prisma.$disconnect();
      logger.success("✅ Database disconnected");
      process.exit(0);
    });
  } catch (error) {
    logger.error("🛑 Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
