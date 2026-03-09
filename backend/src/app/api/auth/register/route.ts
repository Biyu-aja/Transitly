import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { registerSchema } from '@/lib/validation';
import { signToken } from '@/lib/auth';
import { createErrorResponse, createSuccessResponse, excludePassword } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = registerSchema.parse(body);
    
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: validatedData.email },
          { username: validatedData.username },
        ],
      },
    });

    if (existingUser) {
      return createErrorResponse(
        existingUser.email === validatedData.email
          ? 'Email already exists'
          : 'Username already exists',
        409
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        username: validatedData.username,
        password: hashedPassword,
        fullName: validatedData.fullName,
      },
    });

    // Generate token
    const token = await signToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    return createSuccessResponse({
      user: excludePassword(user),
      token,
    }, 201);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return createErrorResponse(error.errors[0].message, 400);
    }
    console.error('Register error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
