import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { createErrorResponse, createSuccessResponse, excludePassword } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getUserFromRequest(request);

    if (!currentUser) {
      return createErrorResponse('Unauthorized', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
    });

    if (!user) {
      return createErrorResponse('User not found', 404);
    }

    return createSuccessResponse({ user: excludePassword(user) });
  } catch (error) {
    console.error('Get user error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
