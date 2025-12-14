import type { Request, Response } from 'express';
import { prisma } from '@/database/client.js';
import { TRPCError } from '@trpc/server';

export async function createUserHandler(req: Request, res: Response) {
  try {
    const { clerkId, email, firstName, lastName, roles } = req.body;

    // Validate required fields
    if (!clerkId || !email || !firstName || !lastName || !roles) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['clerkId', 'email', 'firstName', 'lastName', 'roles'],
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
      });
    }

    // Create user in database
    const user = await prisma.user.create({
      data: {
        clerkId,
        email,
        firstName,
        lastName,
        roles: Array.isArray(roles) ? roles : [roles],
        
        // Set initial tier based on role
        tenantTier: roles.includes('TENANT') ? 'UNVERIFIED' : undefined,
        landlordTier: roles.includes('LANDLORD') ? 'UNVERIFIED' : undefined,
        
        // Default KYC status
        kycStatus: 'PENDING',
      },
    });

    return res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
      },
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({
      error: 'Failed to create user',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
