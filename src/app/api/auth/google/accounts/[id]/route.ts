import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// DELETE /api/auth/google/accounts/[id] — disconnect a Google account
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Verify the account belongs to this user
  const account = await prisma.googleAccount.findFirst({
    where: { id, userId },
  });

  if (!account) {
    return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
  }

  // Cascade delete will remove associated events
  await prisma.googleAccount.delete({ where: { id } });

  return NextResponse.json({ success: true, message: 'Google account disconnected' });
}
