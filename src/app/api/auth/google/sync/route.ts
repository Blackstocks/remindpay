import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { syncUserAccounts } from '@/lib/google';

// POST /api/auth/google/sync — manual sync trigger
export async function POST(request: Request) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const totalSynced = await syncUserAccounts(userId);
    return NextResponse.json({
      success: true,
      message: `Synced ${totalSynced} events`,
      data: { eventsSynced: totalSynced },
    });
  } catch (err) {
    console.error('Manual Google sync error:', err);
    return NextResponse.json({ success: false, error: 'Sync failed' }, { status: 500 });
  }
}
