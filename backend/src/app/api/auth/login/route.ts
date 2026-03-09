import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { loginSchema } from '@/lib/validation';
import { signToken } from '@/lib/auth';
import { createErrorResponse, createSuccessResponse, excludePassword } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = loginSchema.parse(body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (!user) {
      return createErrorResponse('Invalid email or password', 401);
    }

    // Check if user has a password (OAuth users might not)
    if (!user.password) {
      return createErrorResponse('Akun ini dibuat menggunakan Google. Silakan login dengan Google.', 401);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(validatedData.password, user.password);

    if (!isPasswordValid) {
      return createErrorResponse('Invalid email or password', 401);
    }

    // Generate token
    const token = await signToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    return createSuccessResponse({
      user: excludePassword(user),
      token,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return createErrorResponse(error.errors[0].message, 400);
    }
    console.error('Login error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
