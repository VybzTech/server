// // Complete authentication procedures
// // ==========================================
// import { router, publicProcedure, protectedProcedure } from "../trpc.js";
// import { z } from "zod";
// import { TRPCError } from "@trpc/server";
// import { createToken } from "../../lib/jwt.js";

// export const authRouter = router({
//   // ==========================================
//   // AUTHENTICATED PROCEDURES
//   // ==========================================

//   // Get current user (protected)
//   me: protectedProcedure.query(async ({ ctx }) => {
//     const user = await ctx.prisma.user.findUnique({
//       where: { id: ctx.userId },
//       include: {
//         tenantProfile: true,
//         landlordProfile: true,
//         agentProfile: true,
//         officerProfile: true,
//       },
//     });

//     if (!user) {
//       throw new TRPCError({ code: "NOT_FOUND" });
//     }

//     return user;
//   }),

//   // Update user profile
//   updateProfile: protectedProcedure
//     .input(
//       z.object({
//         firstName: z.string().optional(),
//         lastName: z.string().optional(),
//         middleName: z.string().optional(),
//         profileImage: z.string().optional(),
//         bio: z.string().optional(),
//         dateOfBirth: z.string().datetime().optional(),
//         gender: z.string().optional(),
//         religion: z.string().optional(),
//         phone: z.string().optional(),
//       })
//     )
//     .mutation(async ({ input, ctx }) => {
//       return await ctx.prisma.user.update({
//         where: { id: ctx.userId },
//         data: {
//           ...input,
//           dateOfBirth: input.dateOfBirth
//             ? new Date(input.dateOfBirth)
//             : undefined,
//         },
//       });
//     }),

//   // Update address
//   updateAddress: protectedProcedure
//     .input(
//       z.object({
//         address: z.string(),
//         addressNumber: z.string(),
//         city: z.string(),
//         state: z.string(),
//         country: z.string(),
//         latitude: z.number().optional(),
//         longitude: z.number().optional(),
//       })
//     )
//     .mutation(async ({ input, ctx }) => {
//       return await ctx.prisma.user.update({
//         where: { id: ctx.userId },
//         data: input,
//       });
//     }),

//   // Request KYC verification (submit documents)
//   requestKYC: protectedProcedure
//     .input(
//       z.object({
//         documentUrl: z.string(), // S3 URL
//         documentType: z.enum(["NATIONAL_ID", "PASSPORT", "DRIVERS_LICENSE"]),
//       })
//     )
//     .mutation(async ({ input, ctx }) => {
//       // Create verification request
//       const request = await ctx.prisma.verificationRequest.create({
//         data: {
//           userId: ctx.userId,
//           type: "KYC",
//           documents: [input.documentUrl],
//           status: "PENDING",
//         },
//       });

//       // Update user status
//       await ctx.prisma.user.update({
//         where: { id: ctx.userId },
//         data: { kycStatus: "PENDING" },
//       });

//       return request;
//     }),

//   // Request BVN verification (Pro tier)
//   requestBVN: protectedProcedure
//     .input(z.object({ bvnNumber: z.string() }))
//     .mutation(async ({ input, ctx }) => {
//       // Check subscription tier
//       const user = await ctx.prisma.user.findUnique({
//         where: { id: ctx.userId },
//       });

//       if (user?.tenantTier !== "PRO" && user?.tenantTier !== "PREMIUM") {
//         throw new TRPCError({
//           code: "FORBIDDEN",
//           message: "BVN verification requires PRO tier",
//         });
//       }

//       // Create verification request
//       const request = await ctx.prisma.verificationRequest.create({
//         data: {
//           userId: ctx.userId,
//           type: "BVN",
//           status: "PENDING",
//         },
//       });

//       return request;
//     }),

//   // Logout (optional - mainly for cleanup)
//   logout: protectedProcedure.mutation(async ({ ctx }) => {
//     // Could invalidate tokens in Redis here if needed
//     return { success: true };
//   }),

//   // ==========================================
//   // SIGN UP PROCEDURES (PUBLIC)
//   // ==========================================

//   // Step 1: Create incomplete user record (before auth verification)
//   createIncompleteUser: publicProcedure
//     .input(
//       z.object({
//         supabaseId: z.string(),
//         email: z.string().email().optional(),
//         phone: z.string().optional(),
//         authMethod: z.enum(["EMAIL", "PHONE", "GOOGLE"]),
//       })
//     )
//     .mutation(async ({ input, ctx }) => {
//       try {
//         // Check if already exists
//         const existing = await ctx.prisma.incompleteUser.findUnique({
//           where: { supabaseId: input.supabaseId },
//         });

//         if (existing) {
//           return existing;
//         }

//         // Create incomplete user
//         const incompleteUser = await ctx.prisma.incompleteUser.create({
//           data: {
//             supabaseId: input.supabaseId,
//             email: input.email,
//             phone: input.phone,
//             authMethod: input.authMethod,
//             stage: "ROLE_SELECTION",
//           },
//         });

//         return incompleteUser;
//       } catch (error) {
//         console.error("Error creating incomplete user:", error);
//         throw new TRPCError({
//           code: "INTERNAL_SERVER_ERROR",
//           message: "Failed to create user record",
//         });
//       }
//     }),

//   // Step 2: Update incomplete user with role selection
//   selectRole: publicProcedure
//     .input(
//       z.object({
//         supabaseId: z.string(),
//         roles: z.array(z.string()),
//       })
//     )
//     .mutation(async ({ input, ctx }) => {
//       const incomplete = await ctx.prisma.incompleteUser.findUnique({
//         where: { supabaseId: input.supabaseId },
//       });

//       if (!incomplete) {
//         throw new TRPCError({ code: "NOT_FOUND" });
//       }

//       return await ctx.prisma.incompleteUser.update({
//         where: { supabaseId: input.supabaseId },
//         data: {
//           roles: input.roles,
//           stage: "BASIC_INFO",
//           lastStageAt: new Date(),
//         },
//       });
//     }),

//   // Step 3: Update with basic info and complete onboarding
//   completeOnboarding: publicProcedure
//     .input(
//       z.object({
//         supabaseId: z.string(),
//         email: z.string().email(),
//         firstName: z.string(),
//         lastName: z.string(),
//         profileImage: z.string().optional(),
//         roles: z.array(z.string()),
//       })
//     )
//     .mutation(async ({ input, ctx }) => {
//       try {
//         // Get incomplete user
//         const incomplete = await ctx.prisma.incompleteUser.findUnique({
//           where: { supabaseId: input.supabaseId },
//         });

//         if (!incomplete) {
//           throw new TRPCError({
//             code: "NOT_FOUND",
//             message: "User registration not found",
//           });
//         }

//         // Create complete user from incomplete
//         const newUser = await ctx.prisma.user.create({
//           data: {
//             supabaseId: input.supabaseId,
//             email: input.email,
//             firstName: input.firstName,
//             lastName: input.lastName,
//             profileImage: input.profileImage,
//             roles: input.roles,
//             preferredAuthMethod: incomplete.authMethod,
//             onboardingCompleted: true,
//             onboardingCompletedAt: new Date(),
//           },
//         });

//         // Create role-specific profiles
//         if (input.roles.includes("TENANT")) {
//           await ctx.prisma.tenantProfile.create({
//             data: { userId: newUser.id },
//           });
//         }

//         if (input.roles.includes("LANDLORD") || input.roles.includes("AGENT")) {
//           await ctx.prisma.landlordProfile.create({
//             data: { userId: newUser.id },
//           });
//         }

//         if (input.roles.includes("LANDLORD_AGENT")) {
//           await ctx.prisma.agentProfile.create({
//             data: { userId: newUser.id },
//           });
//         }

//         if (input.roles.some((r) => r.includes("OFFICER"))) {
//           await ctx.prisma.officeProfile.create({
//             data: {
//               userId: newUser.id,
//               level: input.roles[0], // First role is primary
//             },
//           });
//         }

//         // Delete incomplete user
//         await ctx.prisma.incompleteUser.delete({
//           where: { supabaseId: input.supabaseId },
//         });

//         // Generate JWT token
//         const token = createToken(newUser.id);

//         return {
//           user: newUser,
//           token,
//         };
//       } catch (error) {
//         console.error("Error completing onboarding:", error);
//         throw new TRPCError({
//           code: "INTERNAL_SERVER_ERROR",
//           message: "Failed to complete registration",
//         });
//       }
//     }),

//   // ==========================================
//   // LOGIN PROCEDURES (PUBLIC)
//   // ==========================================

//   // Check onboarding status
//   checkOnboardingStatus: publicProcedure
//     .input(z.object({ supabaseId: z.string() }))
//     .query(async ({ input, ctx }) => {
//       // Check if user exists in main table
//       const completeUser = await ctx.prisma.user.findUnique({
//         where: { supabaseId: input.supabaseId },
//         select: {
//           id: true,
//           onboardingCompleted: true,
//           roles: true,
//         },
//       });

//       if (completeUser) {
//         return {
//           status: "COMPLETE",
//           userId: completeUser.id,
//           roles: completeUser.roles,
//         };
//       }

//       // Check incomplete user
//       const incompleteUser = await ctx.prisma.incompleteUser.findUnique({
//         where: { supabaseId: input.supabaseId },
//         select: {
//           stage: true,
//           roles: true,
//         },
//       });

//       if (incompleteUser) {
//         return {
//           status: "IN_PROGRESS",
//           stage: incompleteUser.stage,
//           roles: incompleteUser.roles,
//         };
//       }

//       return {
//         status: "NOT_STARTED",
//       };
//     }),

//   // Get user by Supabase ID (after login verification)
//   // This is called after user authenticates with Supabase
//   getUserBySupabaseId: publicProcedure
//     .input(z.object({ supabaseId: z.string() }))
//     .query(async ({ input, ctx }) => {
//       const user = await ctx.prisma.user.findUnique({
//         where: { supabaseId: input.supabaseId },
//         include: {
//           tenantProfile: true,
//           landlordProfile: true,
//           agentProfile: true,
//           officerProfile: true,
//         },
//       });

//       if (!user) {
//         // User exists in Supabase but not in our DB
//         // This shouldn't happen if onboarding worked, but handle gracefully
//         return null;
//       }

//       if (user.isBlocked) {
//         throw new TRPCError({
//           code: "FORBIDDEN",
//           message: `Account blocked. Reason: ${
//             user.blockReason || "Security reasons"
//           }`,
//         });
//       }

//       // Update last login
//       await ctx.prisma.user.update({
//         where: { id: user.id },
//         data: { lastLoginAt: new Date() },
//       });

//       // Generate JWT
//       const token = createToken(user.id);

//       return {
//         user,
//         token,
//       };
//     }),
// });

import { router, publicProcedure, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createToken } from "../../lib/jwt";
import { logger } from "../../lib/logger";

export const authRouter = router({
  // ==========================================
  // AUTHENTICATED PROCEDURES
  // ==========================================

  me: protectedProcedure.query(async ({ ctx }) => {
    logger.debug("📋 Fetching current user", { userId: ctx.userId });

    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
      include: {
        tenantProfile: true,
        landlordProfile: true,
        agentProfile: true,
        officerProfile: true,
      },
    });

    if (!user) {
      logger.warn("⚠️  User not found", { userId: ctx.userId });
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    logger.success("✅ User fetched successfully");
    return user;
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        middleName: z.string().optional(),
        profileImage: z.string().optional(),
        bio: z.string().optional(),
        dateOfBirth: z.string().datetime().optional(),
        gender: z.string().optional(),
        religion: z.string().optional(),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      logger.info("📝 Updating user profile", { userId: ctx.userId });

      const updated = await ctx.prisma.user.update({
        where: { id: ctx.userId },
        data: {
          ...input,
          dateOfBirth: input.dateOfBirth
            ? new Date(input.dateOfBirth)
            : undefined,
        },
      });

      logger.success("✅ Profile updated");
      return updated;
    }),

  updateAddress: protectedProcedure
    .input(
      z.object({
        address: z.string(),
        addressNumber: z.string(),
        city: z.string(),
        state: z.string(),
        country: z.string(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      logger.info("📍 Updating user address", { userId: ctx.userId });

      const updated = await ctx.prisma.user.update({
        where: { id: ctx.userId },
        data: input,
      });

      logger.success("✅ Address updated");
      return updated;
    }),

  requestKYC: protectedProcedure
    .input(
      z.object({
        documentUrl: z.string(),
        documentType: z.enum(["NATIONAL_ID", "PASSPORT", "DRIVERS_LICENSE"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      logger.info("🆔 KYC verification requested", { userId: ctx.userId });

      const request = await ctx.prisma.verificationRequest.create({
        data: {
          userId: ctx.userId,
          type: "KYC",
          documents: [input.documentUrl],
          status: "PENDING",
        },
      });

      await ctx.prisma.user.update({
        where: { id: ctx.userId },
        data: { kycStatus: "PENDING" },
      });

      logger.success("✅ KYC request created");
      return request;
    }),

  // ==========================================
  // SIGN UP PROCEDURES
  // ==========================================

  createIncompleteUser: publicProcedure
    .input(
      z.object({
        supabaseId: z.string(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        authMethod: z.enum(["EMAIL", "PHONE", "GOOGLE"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      logger.info("👤 Creating incomplete user", {
        supabaseId: input.supabaseId,
        authMethod: input.authMethod,
      });

      try {
        const existing = await ctx.prisma.incompleteUser.findUnique({
          where: { supabaseId: input.supabaseId },
        });

        if (existing) {
          logger.info("ℹ️  Incomplete user already exists");
          return existing;
        }

        const incompleteUser = await ctx.prisma.incompleteUser.create({
          data: {
            supabaseUserId: input.supabaseId,
            email: input.email,
            phone: input.phone,
            authMethod: input.authMethod,
            stage: "AUTH_COMPLETED",
          },
        });

        logger.success("✅ Incomplete user created", {
          incompleteUserId: incompleteUser.id,
        });
        return incompleteUser;
      } catch (error) {
        logger.error("❌ Failed to create incomplete user", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user record",
        });
      }
    }),

  selectRole: publicProcedure
    .input(
      z.object({
        supabaseId: z.string(),
        roles: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      logger.info("🎭 Selecting roles", {
        supabaseId: input.supabaseId,
        roles: input.roles,
      });

      const incomplete = await ctx.prisma.incompleteUser.findUnique({
        where: { supabaseUserId: input.supabaseId },
      });

      if (!incomplete) {
        logger.warn("⚠️  Incomplete user not found");
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const updated = await ctx.prisma.incompleteUser.update({
        where: { supabaseUserId: input.supabaseId },
        data: {
          roles: input.roles,
          stage: "BASIC_INFO",
          lastStageAt: new Date(),
        },
      });

      logger.success("✅ Roles selected");
      return updated;
    }),

  completeOnboarding: publicProcedure
    .input(
      z.object({
        supabaseId: z.string(),
        email: z.string().email(),
        firstName: z.string(),
        lastName: z.string(),
        profileImage: z.string().optional(),
        roles: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      logger.info("🎯 Completing onboarding", {
        supabaseId: input.supabaseId,
        email: input.email,
      });

      try {
        const incomplete = await ctx.prisma.incompleteUser.findUnique({
          where: { supabaseUserId: input.supabaseId },
        });

        if (!incomplete) {
          logger.warn("⚠️  Incomplete user not found");
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User registration not found",
          });
        }

        // Create complete user
        const newUser = await ctx.prisma.user.create({
          data: {
            supabaseUserId: input.supabaseId,
            email: input.email,
            firstName: input.firstName,
            lastName: input.lastName,
            profileImage: input.profileImage,
            roles: input.roles as any,
            provider: incomplete.authMethod as any,
            onboardingCompleted: true,
            onboardingCompletedAt: new Date(),
          },
        });

        logger.success("✅ User created in database", { userId: newUser.id });

        // Create role-specific profiles
        if (input.roles.includes("TENANT")) {
          await ctx.prisma.tenantProfile.create({
            data: { userId: newUser.id },
          });
          logger.debug("✅ Tenant profile created");
        }

        if (
          input.roles.includes("LANDLORD") ||
          input.roles.includes("LANDLORD_AGENT")
        ) {
          await ctx.prisma.landlordProfile.create({
            data: { userId: newUser.id },
          });
          logger.debug("✅ Landlord profile created");
        }

        if (input.roles.includes("LANDLORD_AGENT")) {
          await ctx.prisma.agentProfile.create({
            data: { userId: newUser.id },
          });
          logger.debug("✅ Agent profile created");
        }

        if (input.roles.some((r) => r.includes("OFFICER"))) {
          await ctx.prisma.officerProfile.create({
            data: {
              userId: newUser.id,
              level: input.roles[0] as any,
            },
          });
          logger.debug("✅ Officer profile created");
        }

        // Delete incomplete user
        await ctx.prisma.incompleteUser.delete({
          where: { supabaseUserId: input.supabaseId },
        });

        logger.info("🗑️  Incomplete user deleted");

        // Generate JWT
        const token = createToken(newUser.id);

        logger.success("✅ Onboarding completed successfully");

        return {
          user: newUser,
          token,
        };
      } catch (error) {
        logger.error("❌ Onboarding completion failed", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to complete registration",
        });
      }
    }),

  // ==========================================
  // LOGIN PROCEDURES
  // ==========================================

  checkOnboardingStatus: publicProcedure
    .input(z.object({ supabaseId: z.string() }))
    .query(async ({ input, ctx }) => {
      logger.debug("🔍 Checking onboarding status", {
        supabaseId: input.supabaseId,
      });

      const completeUser = await ctx.prisma.user.findUnique({
        where: { supabaseUserId: input.supabaseId },
        select: {
          id: true,
          onboardingCompleted: true,
          roles: true,
        },
      });

      if (completeUser) {
        logger.success("✅ User found - onboarding complete");
        return {
          status: "COMPLETE" as const,
          userId: completeUser.id,
          roles: completeUser.roles,
        };
      }

      const incompleteUser = await ctx.prisma.incompleteUser.findUnique({
        where: { supabaseUserId: input.supabaseId },
        select: {
          stage: true,
          roles: true,
        },
      });

      if (incompleteUser) {
        logger.info("🟡 User found - onboarding in progress", {
          stage: incompleteUser.stage,
        });
        return {
          status: "IN_PROGRESS" as const,
          stage: incompleteUser.stage,
          roles: incompleteUser.roles,
        };
      }

      logger.info("🆕 New user - onboarding not started");
      return {
        status: "NOT_STARTED" as const,
      };
    }),

  getUserBySupabaseId: publicProcedure
    .input(z.object({ supabaseId: z.string() }))
    .query(async ({ input, ctx }) => {
      logger.debug("🔍 Fetching user by Supabase ID", {
        supabaseId: input.supabaseId,
      });

      const user = await ctx.prisma.user.findUnique({
        where: { supabaseUserId: input.supabaseId },
        include: {
          tenantProfile: true,
          landlordProfile: true,
          agentProfile: true,
          officerProfile: true,
        },
      });

      if (!user) {
        logger.warn("⚠️  User not found in database");
        return null;
      }

      if (user.isBlocked) {
        logger.warn("❌ User account is blocked", { userId: user.id });
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Account blocked. Reason: ${
            user.blockReason || "Security reasons"
          }`,
        });
      }

      // Update last login
      await ctx.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      logger.debug("✅ Last login updated");

      const token = createToken(user.id);

      logger.success("✅ User logged in successfully");

      return {
        user,
        token,
      };
    }),
});
