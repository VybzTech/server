import { propertiesRouter } from './properties';
import { swipesRouter } from './swipes';
import { messagesRouter } from './messages';
import { t } from '../procedures';
import {authRouter} from '../routers/auth';
import userRouter from '../routers/user';

export const appRouter = t.router({
  auth: authRouter,
  users: userRouter,
  properties: propertiesRouter,
  swipes: swipesRouter,
  messages: messagesRouter,
});

export type AppRouter = typeof appRouter;