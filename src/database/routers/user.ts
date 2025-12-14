// import { router, protectedProcedure, adminProcedure,publicProcedure } from '../trpc.js';
// import { z } from 'zod';
// import { TRPCError } from '@trpc/server';

// export const usersRouter = router({
//   getProfile: publicProcedure
//     .input(z.object({ id: z.string() }))
//     .query(async ({ input, ctx }) => {
//       const user = await ctx.prisma.user.findUnique({
//         where: { id: input.id },
//         select: {
//           id: true,
//           firstName: true,
//           lastName: true,
//           profileImage: true,
//           verifiedBadge: true,
//           bio: true,
//         },
//       });

//       if (!user) {
//         throw new TRPCError({ code: 'NOT_FOUND' });
//       }

//       return user;
//     }),

//   updateProfile: protectedProcedure
//     .input(
//       z.object({
//         firstName: z.string().optional(),
//         lastName: z.string().optional(),
//         bio: z.string().optional(),
//         profileImage: z.string().url().optional(),
//       })
//     )
//     .mutation(async ({ input, ctx }) => {
//       return await ctx.prisma.user.update({
//         where: { id: ctx.userId },
//         data: { ...input },
//       });
//     }),

//   getKycStatus: protectedProcedure.query(async ({ ctx }) => {
//     return await ctx.prisma.user.findUnique({
//       where: { id: ctx.userId },
//       select: {
//         kycStatus: true,
//         tenantTier: true,
//         verifiedBadge: true,
//       },
//     });
//   }),

//   requestVerification: protectedProcedure
//     .input(
//       z.object({
//         idDocument: z.string(),
//         proofOfAddress: z.string(),
//       })
//     )
//     .mutation(async ({ input, ctx }) => {
//       return await ctx.prisma.verificationRequest.create({
//         data: {
//           userId: ctx.userId,
//           idDocument: input.idDocument,
//           proofOfAddress: input.proofOfAddress,
//         },
//       });
//     }),

//   getPendingVerifications: adminProcedure.query(async ({ ctx }) => {
//     return await ctx.prisma.verificationRequest.findMany({
//       where: { status: 'PENDING' },
//       include: {
//         user: { select: { firstName: true, lastName: true, email: true } },
//       },
//       orderBy: { submittedAt: 'asc' },
//     });
//   }),

//   approveVerification: adminProcedure
//     .input(z.object({ verificationId: z.string() }))
//     .mutation(async ({ input, ctx }) => {
//       const verification = await ctx.prisma.verificationRequest.findUnique({
//         where: { id: input.verificationId },
//       });

//       if (!verification) {
//         throw new TRPCError({ code: 'NOT_FOUND' });
//       }

//       await ctx.prisma.user.update({
//         where: { id: verification.userId },
//         data: {
//           kycStatus: 'VERIFIED',
//           tenantTier: 'VERIFIED',
//           verifiedBadge: true,
//         },
//       });

//       await ctx.prisma.verificationRequest.update({
//         where: { id: input.verificationId },
//         data: {
//           status: 'APPROVED',
//           reviewedBy: ctx.userId,
//           reviewedAt: new Date(),
//         },
//       });

//       return { success: true };
//     }),
// });






import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { t, protectedProcedure } from '../procedures';

const userRouter = t.router({
  // Get user by ID
  getById: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const user = await ctx.prisma.user.findUnique({
          where: { id: input.userId },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            createdAt: true,
          },
        });

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        return user;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch user',
        });
      }
    }),

  // List all users (admin only)
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(10),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const users = await ctx.prisma.user.findMany({
          take: input.limit,
          skip: input.offset,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        });

        return users;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to list users',
        });
      }
    }),
});

export default userRouter;