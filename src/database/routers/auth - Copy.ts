// import { z } from 'zod';
// import { TRPCError } from '@trpc/server';
// import { t, publicProcedure, protectedProcedure } from '../procedures';
// import { supabaseAdmin } from '../../auth/supabase';
// import { syncSupabaseUser } from '../../auth/sync';

// export const authRouter = t.router({
//   // Get current user
//   me: protectedProcedure.query(async ({ ctx }) => {
//     return {
//       id: ctx.user!.id,
//       email: ctx.user!.email,
//       phone: ctx.user!.phone,
//       name: ctx.user!.name,
//       role: ctx.user!.role,
//       createdAt: ctx.user!.createdAt,
//     };
//   }),

//   // Sign up with email
//   signUp: publicProcedure
//     .input(
//       z.object({
//         email: z.string().email(),
//         password: z.string().min(8),
//         name: z.string().optional(),
//       })
//     )
//     .mutation(async ({ input }) => {
//       try {
//         const { data, error } = await supabaseAdmin.auth.admin.createUser({
//           email: input.email,
//           password: input.password,
//           email_confirm: false,
//           user_metadata: {
//             name: input.name,
//           },
//         });

//         if (error) {
//           throw new TRPCError({
//             code: 'BAD_REQUEST',
//             message: error.message,
//           });
//         }

//         // Sync user to database
//         const jwtPayload = {
//           sub: data.user!.id,
//           email: data.user!.email,
//           phone: null,
//         };

//         await syncSupabaseUser(jwtPayload as any, 'email');

//         return { success: true, userId: data.user!.id };
//       } catch (error) {
//         throw new TRPCError({
//           code: 'INTERNAL_SERVER_ERROR',
//           message: 'Failed to sign up',
//         });
//       }
//     }),

//   // Update profile
//   updateProfile: protectedProcedure
//     .input(
//       z.object({
//         name: z.string().optional(),
//         role: z.enum(['TENANT', 'LANDLORD']).optional(),
//       })
//     )
//     .mutation(async ({ input, ctx }) => {
//       try {
//         const updated = await ctx.prisma.user.update({
//           where: { id: ctx.user!.id },
//           data: {
//             name: input.name,
//             role: input.role,
//           },
//         });

//         return updated;
//       } catch (error) {
//         throw new TRPCError({
//           code: 'INTERNAL_SERVER_ERROR',
//           message: 'Failed to update profile',
//         });
//       }
//     }),

//   // Request phone OTP
//   requestPhoneOTP: publicProcedure
//     .input(z.object({ phone: z.string() }))
//     .mutation(async ({ input }) => {
//       try {
//         // Create user with phone, Supabase will send OTP automatically
//         const { error } = await supabaseAdmin.auth.admin.createUser({
//           phone: input.phone,
//           phone_confirm: false, // Require phone verification
//         });

//         if (error) {
//           throw new TRPCError({
//             code: 'BAD_REQUEST',
//             message: 'Failed to send OTP',
//           });
//         }

//         return { success: true };
//       } catch (error) {
//         throw new TRPCError({
//           code: 'INTERNAL_SERVER_ERROR',
//           message: 'OTP request failed',
//         });
//       }
//     }),

//   // Verify phone OTP
//   verifyPhoneOTP: publicProcedure
//     .input(
//       z.object({
//         phone: z.string(),
//         otp: z.string(),
//       })
//     )
//     .mutation(async ({ input }) => {
//       try {
//         // Verify OTP by creating/updating user with phone
//         const { data, error } = await supabaseAdmin.auth.admin.createUser({
//           phone: input.phone,
//           phone_confirm: true, // Mark phone as confirmed
//         });

//         if (error) {
//           throw new TRPCError({
//             code: 'BAD_REQUEST',
//             message: 'Invalid OTP or phone verification failed',
//           });
//         }

//         // Sync user to database
//         await syncSupabaseUser(
//           {
//             sub: data.user!.id,
//             phone: input.phone,
//           } as any,
//           'phone'
//         );

//         return { success: true, userId: data.user!.id };
//       } catch (error) {
//         throw new TRPCError({
//           code: 'INTERNAL_SERVER_ERROR',
//           message: 'OTP verification failed',
//         });
//       }
//     }),

//   // Google OAuth callback handler
//   googleLoginCallback: publicProcedure
//     .input(
//       z.object({
//         idToken: z.string(),
//       })
//     )
//     .mutation(async ({ input }) => {
//       try {
//         // Verify Google token with Supabase
//         const { data, error } = await supabaseAdmin.auth.signInWithIdToken({
//           provider: 'google',
//           token: input.idToken,
//         });

//         if (error) {
//           throw new TRPCError({
//             code: 'BAD_REQUEST',
//             message: 'Invalid Google token',
//           });
//         }

//         // Sync user
//         await syncSupabaseUser(
//           {
//             sub: data.user!.id,
//             email: data.user!.email,
//           } as any,
//           'google'
//         );

//         return { success: true, userId: data.user!.id };
//       } catch (error) {
//         throw new TRPCError({
//           code: 'INTERNAL_SERVER_ERROR',
//           message: 'Google login failed',
//         });
//       }
//     }),

//   // Sign out
//   signOut: protectedProcedure.mutation(async ({ ctx }) => {
//     try {
//       // Update lastLoginAt to track activity
//       await ctx.prisma.user.update({
//         where: { id: ctx.user!.id },
//         data: { lastLoginAt: new Date() },
//       });

//       return { success: true };
//     } catch (error) {
//       throw new TRPCError({
//         code: 'INTERNAL_SERVER_ERROR',
//         message: 'Failed to sign out',
//       });
//     }
//   }),
// });

// Complete authentication procedures
// ==========================================
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createToken } from "../../lib/jwt.js";

export const authRouter = router({
  // Get current user
  me: protectedProcedure.query(async ({ ctx }) => {
    return {
      id: ctx.user!.id,
      email: ctx.user!.email,
      phone: ctx.user!.phone,
      name: ctx.user!.name,
      role: ctx.user!.role,
      createdAt: ctx.user!.createdAt,
    };
  }),

  // NEW: Get user by Supabase ID
  getUserBySupabaseId: protectedProcedure
    .input(z.object({ supabaseUserId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const user = await ctx.prisma.user.findUnique({
          where: { supabaseUserId: input.supabaseUserId },
          select: {
            id: true,
            email: true,
            phone: true,
            name: true,
            role: true,
            supabaseUserId: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        return user;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch user",
        });
      }
    }),

  // ==========================================
  // SIGN UP PROCEDURES
  // ==========================================

  // Step 1: Create incomplete user record (before auth verification)
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
      try {
        // Check if already exists
        const existing = await ctx.prisma.incompleteUser.findUnique({
          where: { supabaseId: input.supabaseId },
        });

        if (existing) {
          return existing;
        }

        // Create incomplete user
        const incompleteUser = await ctx.prisma.incompleteUser.create({
          data: {
            supabaseId: input.supabaseId,
            email: input.email,
            phone: input.phone,
            authMethod: input.authMethod,
            stage: "ROLE_SELECTION",
          },
        });

        return incompleteUser;
      } catch (error) {
        console.error("Error creating incomplete user:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user record",
        });
      }
    }),

  // Step 2: Update incomplete user with role selection
  selectRole: publicProcedure
    .input(
      z.object({
        supabaseId: z.string(),
        roles: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const incomplete = await ctx.prisma.incompleteUser.findUnique({
        where: { supabaseId: input.supabaseId },
      });

      if (!incomplete) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return await ctx.prisma.incompleteUser.update({
        where: { supabaseId: input.supabaseId },
        data: {
          roles: input.roles,
          stage: "BASIC_INFO",
          lastStageAt: new Date(),
        },
      });
    }),

  // Step 3: Update with basic info and complete onboarding
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
      try {
        // Get incomplete user
        const incomplete = await ctx.prisma.incompleteUser.findUnique({
          where: { supabaseId: input.supabaseId },
        });

        if (!incomplete) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User registration not found",
          });
        }

        // Create complete user from incomplete
        const newUser = await ctx.prisma.user.create({
          data: {
            supabaseId: input.supabaseId,
            email: input.email,
            firstName: input.firstName,
            lastName: input.lastName,
            profileImage: input.profileImage,
            roles: input.roles,
            preferredAuthMethod: incomplete.authMethod,
            onboardingCompleted: true,
            onboardingCompletedAt: new Date(),
          },
        });

        // Create role-specific profiles
        if (input.roles.includes("TENANT")) {
          await ctx.prisma.tenantProfile.create({
            data: { userId: newUser.id },
          });
        }

        if (input.roles.includes("LANDLORD") || input.roles.includes("AGENT")) {
          await ctx.prisma.landlordProfile.create({
            data: { userId: newUser.id },
          });
        }

        if (input.roles.includes("AGENT")) {
          await ctx.prisma.agentProfile.create({
            data: { userId: newUser.id },
          });
        }

        if (input.roles.some((r) => r.includes("OFFICER"))) {
          await ctx.prisma.officeProfile.create({
            data: {
              userId: newUser.id,
              level: input.roles[0], // First role is primary
            },
          });
        }

        // Delete incomplete user
        await ctx.prisma.incompleteUser.delete({
          where: { supabaseId: input.supabaseId },
        });

        // Generate JWT token
        const token = createToken(newUser.id);

        return {
          user: newUser,
          token,
        };
      } catch (error) {
        console.error("Error completing onboarding:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to complete registration",
        });
      }
    }),

  // ==========================================
  // LOGIN PROCEDURES
  // ==========================================

  // Get user by supabaseId (after login verification)
  getUserBySupabaseId: publicProcedure
    .input(z.object({ supabaseId: z.string() }))
    .query(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { supabaseId: input.supabaseId },
        include: {
          tenantProfile: true,
          landlordProfile: true,
          agentProfile: true,
          officerProfile: true,
        },
      });

      if (!user) {
        // User exists in Supabase but not in our DB
        // This shouldn't happen if onboarding worked, but handle gracefully
        return null;
      }

      if (user.isBlocked) {
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

      // Generate JWT
      const token = createToken(user.id);

      return {
        user,
        token,
      };
    }),

  // ==========================================
  // AUTHENTICATED PROCEDURES
  // ==========================================

  // Get current user
  me: protectedProcedure.query(async ({ ctx }) => {
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
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return user;
  }),

  // Update user profile
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
      return await ctx.prisma.user.update({
        where: { id: ctx.userId },
        data: {
          ...input,
          dateOfBirth: input.dateOfBirth
            ? new Date(input.dateOfBirth)
            : undefined,
        },
      });
    }),

  // Update address
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
      return await ctx.prisma.user.update({
        where: { id: ctx.userId },
        data: input,
      });
    }),

  // Request KYC verification (submit documents)
  requestKYC: protectedProcedure
    .input(
      z.object({
        documentUrl: z.string(), // S3 URL
        documentType: z.enum(["NATIONAL_ID", "PASSPORT", "DRIVERS_LICENSE"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Create verification request
      const request = await ctx.prisma.verificationRequest.create({
        data: {
          userId: ctx.userId,
          type: "KYC",
          documents: [input.documentUrl],
          status: "PENDING",
        },
      });

      // Update user status
      await ctx.prisma.user.update({
        where: { id: ctx.userId },
        data: { kycStatus: "PENDING" },
      });

      return request;
    }),

  // Request BVN verification (Pro tier)
  requestBVN: protectedProcedure
    .input(z.object({ bvnNumber: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Check subscription tier
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.userId },
      });

      if (user?.tenantTier !== "PRO" && user?.tenantTier !== "PREMIUM") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "BVN verification requires PRO tier",
        });
      }

      // Create verification request
      const request = await ctx.prisma.verificationRequest.create({
        data: {
          userId: ctx.userId,
          type: "BVN",
          status: "PENDING",
        },
      });

      return request;
    }),

  // Check onboarding status
  checkOnboardingStatus: publicProcedure
    .input(z.object({ supabaseId: z.string() }))
    .query(async ({ input, ctx }) => {
      // Check if user exists in main table
      const completeUser = await ctx.prisma.user.findUnique({
        where: { supabaseId: input.supabaseId },
        select: {
          id: true,
          onboardingCompleted: true,
          roles: true,
        },
      });

      if (completeUser) {
        return {
          status: "COMPLETE",
          userId: completeUser.id,
          roles: completeUser.roles,
        };
      }

      // Check incomplete user
      const incompleteUser = await ctx.prisma.incompleteUser.findUnique({
        where: { supabaseId: input.supabaseId },
        select: {
          stage: true,
          roles: true,
        },
      });

      if (incompleteUser) {
        return {
          status: "IN_PROGRESS",
          stage: incompleteUser.stage,
          roles: incompleteUser.roles,
        };
      }

      return {
        status: "NOT_STARTED",
      };
    }),

  // Logout (optional - mainly for cleanup)
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    // Could invalidate tokens in Redis here if needed
    return { success: true };
  }),
});
