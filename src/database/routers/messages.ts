import { router, protectedProcedure } from '../trpc.js';
import { z } from 'zod';

export const messagesRouter = router({
  getConversation: protectedProcedure
    .input(
      z.object({
        recipientId: z.string(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      return await ctx.prisma.message.findMany({
        where: {
          OR: [
            { senderId: ctx.userId, recipientId: input.recipientId },
            { senderId: input.recipientId, recipientId: ctx.userId },
          ],
        },
        orderBy: { createdAt: 'asc' },
        take: input.limit,
      });
    }),

  getConversations: protectedProcedure.query(async ({ ctx }) => {
    const messages = await ctx.prisma.message.findMany({
      where: {
        OR: [{ senderId: ctx.userId }, { recipientId: ctx.userId }],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const conversationMap = new Map();
    messages.forEach((msg) => {
      const otherUserId =
        msg.senderId === ctx.userId ? msg.recipientId : msg.senderId;
      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, msg);
      }
    });

    return Array.from(conversationMap.values());
  }),

  create: protectedProcedure
    .input(
      z.object({
        recipientId: z.string(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await ctx.prisma.message.create({
        data: {
          senderId: ctx.userId,
          recipientId: input.recipientId,
          content: input.content,
        },
      });
    }),
});