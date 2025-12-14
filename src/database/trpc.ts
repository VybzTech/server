// import { initTRPC, TRPCError } from '@trpc/server';
// import { ZodError } from 'zod';
// import type { Context } from './context';

// const t = initTRPC.context<Context>().create({
//   errorFormatter({ shape, error }) {
//     return {
//       ...shape,
//       data: {
//         ...shape.data,
//         zodError:
//           error.cause instanceof ZodError ? error.cause.flatten() : null,
//       },
//     };
//   },
// });

// export const router = t.router;
// export const createCallerFactory = t.createCallerFactory;

// export const publicProcedure = t.procedure;

// export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
//   if (!ctx.userId) {
//     throw new TRPCError({
//       code: 'UNAUTHORIZED',
//       message: 'Must be logged in',
//     });
//   }
//   return next({
//     ctx: {
//       userId: ctx.userId,
//     },
//   });
// });


// // (tRPC setup)
// // ==========================================
// // import { initTRPC, TRPCError } from "@trpc/server";
// // import type { Context } from "./context";

// // const t = initTRPC.context<Context>().create({
// //   isServer: typeof window === "undefined",
// //   allowOutsideOfServer: true,
// // });

// // export const router = t.router;
// // export const publicProcedure = t.procedure;

// // export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
// //   if (!ctx.userId) {
// //     throw new TRPCError({
// //       code: "UNAUTHORIZED",
// //       message: "You must be logged in",
// //     });
// //   }
// //   return next({
// //     ctx: {
// //       ...ctx,
// //       userId: ctx.userId,
// //     },
// //   });
// // });

// // export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
// //   const user = await ctx.prisma.user.findUnique({
// //     where: { id: ctx.userId },
// //     select: { roles: true },
// //   });

// //   if (!user?.roles.includes("OFFICER_SUPER_ADMIN")) {
// //     throw new TRPCError({
// //       code: "FORBIDDEN",
// //       messfage: "Admin only",
// //     });
// //   }

// //   return next();
// // });


import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from './context.js';

const t = initTRPC.context<Context>().create({
  isServer: typeof window === 'undefined',
  allowOutsideOfServer: true,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in',
    });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const user = await ctx.prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { roles: true },
  });

  if (!user?.roles.includes('OFFICER_SUPER_ADMIN')) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin only',
    });
  }

  return next();
});