import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import { prisma } from "./database/client.js";
import { authRoutes } from "./routes/auth.js";
import { userRoutes } from "./routes/user.js";
import { propertyRoutes } from "./routes/properties.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authMiddleware } from "./middleware/auth.js";
import { logger } from "./lib/logger.js";


dotenv.config({ path: ".env.local" });

const app: Express = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:8081",
      "http://localhost:19000",
      process.env.MOBILE_URL,
      process.env.WEB_URL,
    ].filter(Boolean),
    credentials: true,
  })
);

// ==========================================
// HEALTH CHECK
// ==========================================
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ==========================================
// DATABASE CONNECTION CHECK
// ==========================================
async function checkDatabaseConnection() {
  try {
    logger.info("🔍 Checking database connection...");
    await prisma.$queryRaw`SELECT 1`;
    logger.success("✅ Database connected successfully");

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

// ==========================================
// API ROUTES
// ==========================================

// Auth routes (no authentication needed)
app.use("/api/auth", authRoutes);

// User routes (protected)
app.use("/api/users", authMiddleware, userRoutes);

// Property routes (protected)
app.use("/api/properties", authMiddleware, propertyRoutes);

// ==========================================
// 404 HANDLER
// ==========================================
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not found",
    path: req.path,
    method: req.method,
  });
});

// ==========================================
// ERROR HANDLER
// ==========================================
app.use(errorHandler);

// ==========================================
// SERVER STARTUP
// ==========================================
async function startServer() {
  try {
    const dbConnected = await checkDatabaseConnection();

    if (!dbConnected) {
      logger.error("🛑 Server startup aborted: Database not connected");
      process.exit(1);
    }

    app.listen(PORT, () => {
      logger.success(`\n🚀 Server running on http://localhost:${PORT}`);
      logger.info(`\n📍 API Routes:`);
      logger.info(`   POST   /api/auth/signup`);
      logger.info(`   POST   /api/auth/login`);
      logger.info(`   POST   /api/auth/complete-onboarding`);
      logger.info(`   POST   /api/users/profile`);
      logger.info(`   GET    /api/users/me`);
      logger.info(`   POST   /api/properties`);
      logger.info(`   GET    /api/properties\n`);
    });

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