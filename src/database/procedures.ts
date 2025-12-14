import { TRPCError, initTRPC } from '@trpc/server';
import { Context } from './context';

export const t = initTRPC.context<Context>().create();

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async (opts) => {
  const { ctx } = opts;

  if (!ctx.user || !ctx.token) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  return opts.next({
    ctx: {
      ...ctx,
      user: ctx.user,
      token: ctx.token,
    },
  });
});

export const tenantOrLandlordProcedure = protectedProcedure.use(async (opts) => {
  const { ctx } = opts;

  if (!ctx.user || (ctx.user.role !== 'tenant' && ctx.user.role !== 'landlord')) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Invalid user role',
    });
  }

  return opts.next();
});

export const landlordOnlyProcedure = protectedProcedure.use(async (opts) => {
  const { ctx } = opts;

  if (ctx.user?.role !== 'landlord') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Only landlords can access this resource',
    });
  }

  return opts.next();
});