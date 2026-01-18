import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifyPassword } from '@/lib/auth/password';
import { signCookieValue } from '@/lib/auth/cookie-signing';

const log = logger.child({ module: 'auth/login' });

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
      log.warn('Login attempt: invalid input', { username });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        passwordHash: true,
        disabled: true,
        mustChangePassword: true,
        role: true,
      },
    });

    if (!user) {
      log.warn('Login attempt: user not found', { username });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.disabled) {
      log.warn('Login attempt: user disabled', { userId: user.id });
      return NextResponse.json({ error: 'Account is disabled' }, { status: 403 });
    }

    if (!user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      log.warn('Login attempt: invalid password', { userId: user.id });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const signed = signCookieValue(user.id);
    log.info('User logged in successfully', { userId: user.id });

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        },
      },
      { status: 200 }
    );

    response.cookies.set('mirrorbuddy-user-id', signed.signed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    log.error('Login error', { error: String(error) });
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
