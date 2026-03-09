import { NextRequest } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import { createErrorResponse, createSuccessResponse, excludePassword } from '@/lib/utils';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credential } = body;

    if (!credential) {
      return createErrorResponse('Google credential is required', 400);
    }

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    
    if (!payload || !payload.email) {
      return createErrorResponse('Invalid Google token', 400);
    }

    const { sub: googleId, email, name, picture } = payload;

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // Update googleId if not set
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { email },
          data: { googleId },
        });
      }
    } else {
      // Create new user
      // Generate unique username from email
      const baseUsername = email.split('@')[0];
      let username = baseUsername;
      let counter = 1;

      // Ensure username is unique
      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      user = await prisma.user.create({
        data: {
          email,
          username,
          googleId,
          fullName: name || undefined,
          avatarUrl: picture || undefined,
        },
      });
    }

    // Generate JWT token
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
    console.error('Google OAuth error:', error);
    return createErrorResponse('Google authentication failed', 500);
  }
}
