import express from "express";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import dotenv from "dotenv";
// import { clerkMiddleware } from "@clerk/express";
import { appRouter } from "./database/routers/index.js";
import { createContext } from "./database/context.js";
import { healthCheckHandler } from "./routes/health.js";
// import { clerkClient, requireAuth, getAuth } from "@clerk/express";
// import { createUserHandler } from "@/routes/auth.ts";
// import { stripeWebhookHandler } from './webhooks/stripe.js';
import morgan from 'morgan';
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

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(morgan('dev'));
// app.use(clerkMiddleware());

app.use(express.json());

// ROUTES
// ==========================================

// Use requireAuth() to protect this route
// // If user isn't authenticated, requireAuth() will redirect back to the homepage
// app.get("/protected", requireAuth(), async (req, res) => {
//   // Use `getAuth()` to get the user's `userId`
//   const { userId } = getAuth(req);

//   // Use Clerk's JavaScript Backend SDK to get the user's User object
//   const user = await clerkClient.users.getUser(userId);

//   return res.json({ user });
// });

// Health check
app.get("/api/health", healthCheckHandler);
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
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
    onError({ error, type, path, input, ctx, req }) {
      console.error(`[tRPC] ${type} on ${path}:`, error);

      if (process.env.NODE_ENV === "production") {
        // Send to error tracking (Sentry, DataDog, etc)
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
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(
    `📡 tRPC endpoint: http://localhost:${PORT}/api/trpc or http://localhost:${PORT}/api/trpc-test/`
  );
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
});
