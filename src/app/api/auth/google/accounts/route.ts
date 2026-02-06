import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// GET /api/auth/google/accounts — lists connected Google accounts
export async function GET(request: Request) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const accounts = await prisma.googleAccount.findMany({
    where: { userId },
    select: {
      id: true,
      email: true,
      lastSyncAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ success: true, data: accounts });
}
