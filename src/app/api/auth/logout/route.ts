import { cookies } from 'next/headers';

export async function POST(_request: Request) {
  try {
    const cookieStore = await cookies();

    // Clear the session cookie
    cookieStore.set('mirrorbuddy-user-id', '', {
      maxAge: 0,
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    // Log logout event
    console.log(`[auth/logout] User logged out at ${new Date().toISOString()}`);

    return Response.json({ success: true });
  } catch (error) {
    console.error('[auth/logout] Logout failed:', error);
    return Response.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}
