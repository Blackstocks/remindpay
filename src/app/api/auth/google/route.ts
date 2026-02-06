import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getAuthUrl } from '@/lib/google';

// GET /api/auth/google — redirects to Google OAuth consent screen
export async function GET(request: Request) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Pass userId as state so we can associate the account on callback
  const url = getAuthUrl(userId);
  return NextResponse.redirect(url);
}
