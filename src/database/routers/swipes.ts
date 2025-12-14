import { router, protectedProcedure } from '../trpc.js';
import { z } from 'zod';

export const swipesRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().uuid(),
        direction: z.enum(['LEFT', 'RIGHT']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const swipe = await ctx.prisma.swipe.create({
        data: {
          tenantId: ctx.userId,
          propertyId: input.propertyId,
          direction: input.direction,
        },
      });

      if (input.direction === 'RIGHT') {
        const property = await ctx.prisma.property.findUnique({
          where: { id: input.propertyId },
          select: { landlordId: true, title: true },
        });

        if (property) {
          const existingMatch = await ctx.prisma.match.findUnique({
            where: {
              tenantId_propertyId: {
                tenantId: ctx.userId,
                propertyId: input.propertyId,
              },
            },
          });

          if (!existingMatch) {
            const match = await ctx.prisma.match.create({
              data: {
                tenantId: ctx.userId,
                propertyId: input.propertyId,
                landlordId: property.landlordId,
              },
            });

            return {
              isMatch: true,
              matchId: match.id,
              message: `You matched on ${property.title}!`,
            };
          }
        }
      }

      return { isMatch: false };
    }),

  getHistory: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.swipe.findMany({
      where: { tenantId: ctx.userId },
      include: { property: true },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
  }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const [rightSwipes, leftSwipes, matches] = await Promise.all([
      ctx.prisma.swipe.count({
        where: { tenantId: ctx.userId, direction: 'RIGHT' },
      }),
      ctx.prisma.swipe.count({
        where: { tenantId: ctx.userId, direction: 'LEFT' },
      }),
      ctx.prisma.match.count({
        where: { tenantId: ctx.userId, status: 'ACTIVE' },
      }),
    ]);

    return { rightSwipes, leftSwipes, matches };
  }),
});