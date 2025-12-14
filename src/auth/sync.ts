import { prisma } from '../database/client';
import { JWTPayload } from './jwt';

export async function syncSupabaseUser(
  payload: JWTPayload,
  provider: 'email' | 'phone' | 'google' | 'github'
) {
  const supabaseUserId = payload.sub;
  const email = payload.email || null;
  const phone = payload.phone || null;

  try {
    // Upsert user in Prisma
    const user = await prisma.user.upsert({
      where: { supabaseUserId },
      create: {
        supabaseUserId,
        email,
        phone,
        provider,
        role: 'tenant', // Default role
      },
      update: {
        email: email || undefined,
        phone: phone || undefined,
        provider,
      },
    });

    return user;
  } catch (error) {
    console.error('User sync failed:', error);
    throw error;
  }
}