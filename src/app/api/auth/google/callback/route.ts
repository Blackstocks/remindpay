import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exchangeCode, syncCalendarEvents } from '@/lib/google';

// GET /api/auth/google/callback — handles OAuth callback from Google
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // userId
  const error = searchParams.get('error');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (error) {
    return NextResponse.redirect(`${baseUrl}/settings?google=error&reason=${error}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/settings?google=error&reason=missing_params`);
  }

  try {
    // Verify the user exists
    const user = await prisma.user.findUnique({ where: { id: state } });
    if (!user) {
      return NextResponse.redirect(`${baseUrl}/settings?google=error&reason=invalid_user`);
    }

    // Exchange code for tokens
    const { email, accessToken, refreshToken, tokenExpiry } = await exchangeCode(code);

    // Upsert the Google account (same user + same email = update tokens)
    const account = await prisma.googleAccount.upsert({
      where: { userId_email: { userId: state, email } },
      create: {
        userId: state,
        email,
        accessToken,
        refreshToken,
        tokenExpiry,
      },
      update: {
        accessToken,
        refreshToken,
        tokenExpiry,
      },
    });

    // Trigger initial sync in background (don't block redirect)
    syncCalendarEvents(account.id).catch((err) =>
      console.error('Initial Google Calendar sync failed:', err)
    );

    return NextResponse.redirect(`${baseUrl}/settings?google=success&email=${encodeURIComponent(email)}`);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(`${baseUrl}/settings?google=error&reason=exchange_failed`);
  }
}
