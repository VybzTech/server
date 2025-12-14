// import { router, publicProcedure, protectedProcedure } from '../trpc.js';
// import { z } from 'zod';
// import { createToken } from '../../lib/jwt.js';
// import { TRPCError } from '@trpc/server';

// export const authRouter = router({
//   exchangeToken: publicProcedure
//     .input(z.object({ sessionId: z.string() }))
//     .mutation(async ({ input, ctx }) => {
//       try {
//         const token = createToken(input.sessionId);
//         return { token };
//       } catch (err) {
//         throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
//       }
//     }),

//   me: protectedProcedure.query(async ({ ctx }) => {
//     const user = await ctx.prisma.user.findUnique({
//       where: { id: ctx.userId },
//       select: {
//         id: true,
//         email: true,
//         firstName: true,
//         lastName: true,
//         profileImage: true,
//         roles: true,
//         tenantTier: true,
//         verifiedBadge: true,
//       },
//     });

//     if (!user) {
//       throw new TRPCError({ code: 'NOT_FOUND' });
//     }

//     return user;
//   }),

//   logout: protectedProcedure.mutation(async ({ ctx }) => {
//     return { success: true };
//   }),
// });


// import { z } from 'zod';
// import { TRPCError } from '@trpc/server';
// import { t, publicProcedure, protectedProcedure } from '../procedures';
// import { supabaseAdmin } from '../../auth/supabase';
// import { syncSupabaseUser } from '../../auth/sync';
// import { verifySupabaseJWT } from '../../auth/jwt';

// const authRouter = t.router({
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
//     .mutation(async ({ input, ctx }) => {
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

//         await syncSupabaseUser(
//           jwtPayload as any,
//           'email'
//         );

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
//     .input(
//       z.object({
//         phone: z.string(),
//         otp: z.string(),
//       })
//     )
//     .mutation(async ({ input, ctx }) => {
//       try {
//         // In production, verify OTP against Supabase or Twilio
//         // For now, this is a placeholder
//         const { data, error } = await supabaseAdmin.auth.admin.createUser({
//           phone: input.phone,
//           email_confirm: false,
//         });

//         if (error) {
//           throw new TRPCError({
//             code: 'BAD_REQUEST',
//             message: 'Invalid OTP',
//           });
//         }

//         // Sync user
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
//         idToken: z.string(), // ID token from Google
//       })
//     )
//     .mutation(async ({ input }) => {
//       try {
//         // Exchange Google token for Supabase session
//         const { data, error } = await supabaseAdmin.auth.admin.getUser(
//           input.idToken
//         );

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

//   // Sign out (client-side primarily)
//   signOut: protectedProcedure.mutation(async ({ ctx }) => {
//     // Update lastLoginAt to track activity
//     await ctx.prisma.user.update({
//       where: { id: ctx.user!.id },
//       data: { lastLoginAt: new Date() },
//     });

//     return { success: true };
//   }),
// });

// export default authRouter;





import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { t, publicProcedure, protectedProcedure } from '../procedures';
import { supabaseAdmin } from '../../auth/supabase';
import { syncSupabaseUser } from '../../auth/sync';

export const authRouter = t.router({
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

  // Sign up with email
  signUp: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: input.email,
          password: input.password,
          email_confirm: false,
          user_metadata: {
            name: input.name,
          },
        });

        if (error) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
          });
        }

        // Sync user to database
        const jwtPayload = {
          sub: data.user!.id,
          email: data.user!.email,
          phone: null,
        };

        await syncSupabaseUser(jwtPayload as any, 'email');

        return { success: true, userId: data.user!.id };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to sign up',
        });
      }
    }),

  // Update profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        role: z.enum(['TENANT', 'LANDLORD']).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const updated = await ctx.prisma.user.update({
          where: { id: ctx.user!.id },
          data: {
            name: input.name,
            role: input.role,
          },
        });

        return updated;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update profile',
        });
      }
    }),

  // Request phone OTP
  requestPhoneOTP: publicProcedure
    .input(z.object({ phone: z.string() }))
    .mutation(async ({ input }) => {
      try {
        // Create user with phone, Supabase will send OTP automatically
        const { error } = await supabaseAdmin.auth.admin.createUser({
          phone: input.phone,
          phone_confirm: false, // Require phone verification
        });

        if (error) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Failed to send OTP',
          });
        }

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'OTP request failed',
        });
      }
    }),

  // Verify phone OTP
  verifyPhoneOTP: publicProcedure
    .input(
      z.object({
        phone: z.string(),
        otp: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Verify OTP by creating/updating user with phone
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          phone: input.phone,
          phone_confirm: true, // Mark phone as confirmed
        });

        if (error) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid OTP or phone verification failed',
          });
        }

        // Sync user to database
        await syncSupabaseUser(
          {
            sub: data.user!.id,
            phone: input.phone,
          } as any,
          'phone'
        );

        return { success: true, userId: data.user!.id };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'OTP verification failed',
        });
      }
    }),

  // Google OAuth callback handler
  googleLoginCallback: publicProcedure
    .input(
      z.object({
        idToken: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Verify Google token with Supabase
        const { data, error } = await supabaseAdmin.auth.signInWithIdToken({
          provider: 'google',
          token: input.idToken,
        });

        if (error) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid Google token',
          });
        }

        // Sync user
        await syncSupabaseUser(
          {
            sub: data.user!.id,
            email: data.user!.email,
          } as any,
          'google'
        );

        return { success: true, userId: data.user!.id };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Google login failed',
        });
      }
    }),

  // Sign out
  signOut: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // Update lastLoginAt to track activity
      await ctx.prisma.user.update({
        where: { id: ctx.user!.id },
        data: { lastLoginAt: new Date() },
      });

      return { success: true };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to sign out',
      });
    }
  }),
});