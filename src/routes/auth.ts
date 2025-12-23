// import type { Request, Response } from 'express';
// import { prisma } from '@/database/client.js';
// import { TRPCError } from '@trpc/server';

// export async function createUserHandler(req: Request, res: Response) {
//   try {
//     const { clerkId, email, firstName, lastName, roles } = req.body;

//     // Validate required fields
//     if (!clerkId || !email || !firstName || !lastName || !roles) {
//       return res.status(400).json({
//         error: 'Missing required fields',
//         required: ['clerkId', 'email', 'firstName', 'lastName', 'roles'],
//       });
//     }

//     // Check if user already exists
//     const existingUser = await prisma.user.findUnique({
//       where: { clerkId },
//     });

//     if (existingUser) {
//       return res.status(409).json({
//         error: 'User already exists',
//       });
//     }

//     // Create user in database
//     const user = await prisma.user.create({
//       data: {
//         clerkId,
//         email,
//         firstName,
//         lastName,
//         roles: Array.isArray(roles) ? roles : [roles],
        
//         // Set initial tier based on role
//         tenantTier: roles.includes('TENANT') ? 'UNVERIFIED' : undefined,
//         landlordTier: roles.includes('LANDLORD') ? 'UNVERIFIED' : undefined,
        
//         // Default KYC status
//         kycStatus: 'PENDING',
//       },
//     });

//     return res.status(201).json({
//       success: true,
//       user: {
//         id: user.id,
//         email: user.email,
//         firstName: user.firstName,
//         lastName: user.lastName,
//         roles: user.roles,
//       },
//     });
//   } catch (err) {
//     console.error('Create user error:', err);
//     res.status(500).json({
//       error: 'Failed to create user',
//       message: err instanceof Error ? err.message : 'Unknown error',
//     });
//   }
// }


import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../database/client.js";
import { createToken } from "../lib/jwt.js";
import { logger } from "../lib/logger.js";

export const authRoutes = Router();

// Validation schemas
const signupSchema = z.object({
  supabaseId: z.string(),
  email: z.string().email(),
  authMethod: z.enum(["EMAIL", "PHONE", "GOOGLE"]),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const onboardingSchema = z.object({
  supabaseId: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  roles: z.array(z.string()),
  profileImage: z.string().optional(),
});

const selectRoleSchema = z.object({
  supabaseId: z.string(),
  roles: z.array(z.string()),
});
// ==========================================
// POST /api/auth/signup
// Create incomplete user record
// ==========================================
authRoutes.post("/signup", async (req: Request, res: Response) => {
  try {
    console.log("[Auth.signup] Request:", req.body);

    const data = signupSchema.parse(req.body);

    // Check if already exists
    const existing = await prisma.incompleteUser.findUnique({
      where: { supabaseUserId: data.supabaseId },
    });

    if (existing) {
      logger.info("[Auth.signup] User already exists");
      return res.status(200).json({
        success: true,
        message: "User already registered",
        data: existing,
      });
    }

    // Create incomplete user
    const incompleteUser = await prisma.incompleteUser.create({
      data: {
        supabaseUserId: data.supabaseId,
        email: data.email,
        authMethod: data.authMethod,
        stage: "AUTH_COMPLETED",
      },
    });

    logger.success("[Auth.signup] User created");

    res.status(201).json({
      success: true,
      message: "User record created. Next: select roles",
      data: incompleteUser,
    });
  } catch (error) {
    logger.error("[Auth.signup] Error:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
    }

    res.status(500).json({
      error: "Failed to create user",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ==========================================
// POST /api/auth/select-role
// Update incomplete user with roles
// ==========================================
authRoutes.post("/select-role", async (req: Request, res: Response) => {
  try {
    console.log("[Auth.selectRole] Request:", req.body);

    const data = selectRoleSchema.parse(req.body);

    const incomplete = await prisma.incompleteUser.findUnique({
      where: { supabaseUserId: data.supabaseId },
    });

    if (!incomplete) {
      return res.status(404).json({
        error: "Not found",
        message: "User registration not found",
      });
    }

    const updated = await prisma.incompleteUser.update({
      where: { supabaseUserId: data.supabaseId },
      data: {
        roles: data.roles,
        stage: "BASIC_INFO",
        lastStageAt: new Date(),
      },
    });

    logger.success("[Auth.selectRole] Roles selected");

    res.json({
      success: true,
      message: "Roles selected. Next: complete onboarding",
      data: updated,
    });
  } catch (error) {
    logger.error("[Auth.selectRole] Error:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
    }

    res.status(500).json({
      error: "Failed to select role",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ==========================================
// POST /api/auth/complete-onboarding
// Create complete user from incomplete user
// ==========================================
authRoutes.post("/complete-onboarding", async (req: Request, res: Response) => {
  try {
    console.log("[Auth.completeOnboarding] Request:", req.body);

    const data = onboardingSchema.parse(req.body);

    // Get incomplete user
    const incomplete = await prisma.incompleteUser.findUnique({
      where: { supabaseUserId: data.supabaseId },
    });

    if (!incomplete) {
      return res.status(404).json({
        error: "Not found",
        message: "User registration not found",
      });
    }

    // Upsert user (update if exists, create if not)
    const newUser = await prisma.user.upsert({
      where: { supabaseUserId: data.supabaseId },
      update: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        profileImage: data.profileImage,
        roles: data.roles as any,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      },
      create: {
        supabaseUserId: data.supabaseId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        profileImage: data.profileImage,
        roles: data.roles as any,
        provider: incomplete.authMethod as any,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      },
    });

    logger.success("[Auth.completeOnboarding] User created/updated");

    // Create role-specific profiles if they don't exist
    if (data.roles.includes("TENANT")) {
      await prisma.tenantProfile.upsert({
        where: { userId: newUser.id },
        update: {},
        create: { userId: newUser.id },
      });
      logger.info("[Auth.completeOnboarding] Tenant profile created/updated");
    }

    if (
      data.roles.includes("LANDLORD") ||
      data.roles.includes("LANDLORD_AGENT")
    ) {
      await prisma.landlordProfile.upsert({
        where: { userId: newUser.id },
        update: {},
        create: { userId: newUser.id },
      });
      logger.info("[Auth.completeOnboarding] Landlord profile created/updated");
    }

    if (data.roles.includes("LANDLORD_AGENT")) {
      await prisma.agentProfile.upsert({
        where: { userId: newUser.id },
        update: {},
        create: { userId: newUser.id },
      });
      logger.info("[Auth.completeOnboarding] Agent profile created/updated");
    }

    // Delete incomplete user
    await prisma.incompleteUser.delete({
      where: { supabaseUserId: data.supabaseId },
    });

    // Generate JWT
    const token = createToken(newUser.id);

    logger.success("[Auth.completeOnboarding] Onboarding completed");

    res.status(201).json({
      success: true,
      message: "Onboarding completed successfully",
      data: {
        user: newUser,
        token,
      },
    });
  } catch (error) {
    logger.error("[Auth.completeOnboarding] Error:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
    }

    res.status(500).json({
      error: "Failed to complete onboarding",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// authRoutes.post("/complete-onboarding", async (req: Request, res: Response) => {
//   try {
//     console.log("[Auth.completeOnboarding] Request:", req.body);

//     const data = onboardingSchema.parse(req.body);

//     // Get incomplete user
//     const incomplete = await prisma.incompleteUser.findUnique({
//       where: { supabaseUserId: data.supabaseId },
//     });

//     if (!incomplete) {
//       return res.status(404).json({
//         error: "Not found",
//         message: "User registration not found",
//       });
//     }

//     // Create complete user
//     const newUser = await prisma.user.create({
//       data: {
//         supabaseUserId: data.supabaseId,
//         email: data.email,
//         firstName: data.firstName,
//         lastName: data.lastName,
//         profileImage: data.profileImage,
//         roles: data.roles as any,
//         provider: incomplete.authMethod as any,
//         onboardingCompleted: true,
//         onboardingCompletedAt: new Date(),
//       },
//     });

//     logger.success("[Auth.completeOnboarding] User created");

//     // Create role-specific profiles
//     if (data.roles.includes("TENANT")) {
//       await prisma.tenantProfile.create({
//         data: { userId: newUser.id },
//       });
//       logger.info("[Auth.completeOnboarding] Tenant profile created");
//     }

//     if (
//       data.roles.includes("LANDLORD") ||
//       data.roles.includes("LANDLORD_AGENT")
//     ) {
//       await prisma.landlordProfile.create({
//         data: { userId: newUser.id },
//       });
//       logger.info("[Auth.completeOnboarding] Landlord profile created");
//     }

//     if (data.roles.includes("LANDLORD_AGENT")) {
//       await prisma.agentProfile.create({
//         data: { userId: newUser.id },
//       });
//       logger.info("[Auth.completeOnboarding] Agent profile created");
//     }

//     // Delete incomplete user
//     await prisma.incompleteUser.delete({
//       where: { supabaseUserId: data.supabaseId },
//     });

//     // Generate JWT
//     const token = createToken(newUser.id);

//     logger.success("[Auth.completeOnboarding] Onboarding completed");

//     res.status(201).json({
//       success: true,
//       message: "Onboarding completed successfully",
//       data: {
//         user: newUser,
//         token,
//       },
//     });
//   } catch (error) {
//     logger.error("[Auth.completeOnboarding] Error:", error);

//     if (error instanceof z.ZodError) {
//       return res.status(400).json({
//         error: "Validation error",
//         details: error.errors,
//       });
//     }

//     res.status(500).json({
//       error: "Failed to complete onboarding",
//       message: error instanceof Error ? error.message : "Unknown error",
//     });
//   }
// });

// ==========================================
// POST /api/auth/login
// Login existing user by Supabase ID
// ==========================================
authRoutes.post("/login", async (req: Request, res: Response) => {
  try {
    console.log("[Auth.login] Request:", req.body);

    const { supabaseId } = z
      .object({ supabaseId: z.string() })
      .parse(req.body);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { supabaseUserId: supabaseId },
      include: {
        tenantProfile: true,
        landlordProfile: true,
        agentProfile: true,
        officerProfile: true,
      },
    });

    if (!user) {
      logger.warn("[Auth.login] User not found");
      return res.status(404).json({
        error: "Not found",
        message: "User not found. Please complete onboarding first.",
      });
    }

    if (user.isBlocked) {
      logger.warn("[Auth.login] User is blocked");
      return res.status(403).json({
        error: "Forbidden",
        message: `Account blocked. Reason: ${user.blockReason || "Security reasons"}`,
      });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT
    const token = createToken(user.id);

    logger.success("[Auth.login] User logged in");

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    logger.error("[Auth.login] Error:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
    }

    res.status(500).json({
      error: "Failed to login",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
