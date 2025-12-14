import { router, publicProcedure } from '../trpc.js';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const propertiesRouter = router({
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const property = await ctx.prisma.property.findUnique({
        where: { id: input.id },
        include: {
          landlord: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
              verifiedBadge: true,
            },
          },
        },
      });

      if (!property) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Property not found',
        });
      }

      return property;
    }),

  getFeed: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      let swipedIds: string[] = [];

      if (ctx.userId) {
        const swipes = await ctx.prisma.swipe.findMany({
          where: { tenantId: ctx.userId },
          select: { propertyId: true },
        });
        // swipedIds =[];
        swipedIds = swipes.map((s) => s.propertyId);
      }

      const properties = await ctx.prisma.property.findMany({
        take: input.limit + 1,
        skip: input.cursor ? 1 : 0,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        where: {
          status: 'ACTIVE',
          id: {
            notIn: swipedIds,
          },
        },
        include: {
          landlord: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              verifiedBadge: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      let nextCursor: string | undefined;
      if (properties.length > input.limit) {
        nextCursor = properties.pop()?.id;
      }

      return { properties, nextCursor };
    }),

  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return await ctx.prisma.property.findMany({
        where: {
          status: 'ACTIVE',
          AND: [
            {
              OR: [
                { title: { contains: input.query, mode: 'insensitive' } },
                { address: { contains: input.query, mode: 'insensitive' } },
              ],
            },
            input.minPrice ? { priceMonthly: { gte: input.minPrice } } : {},
            input.maxPrice ? { priceMonthly: { lte: input.maxPrice } } : {},
          ],
        },
        take: 50,
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(5),
        address: z.string().min(5),
        priceMonthly: z.number().positive(),
        beds: z.number().positive(),
        baths: z.number().positive(),
        images: z.array(z.string().url()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      return await ctx.prisma.property.create({
        data: {
          ...input,
          landlordId: ctx.userId,
        },
      });
    }),
});