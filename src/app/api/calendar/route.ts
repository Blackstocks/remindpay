import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// GET /api/calendar?from=...&to=... — returns reminders + EMI payments for a date range
export async function GET(request: Request) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ success: false, error: 'from and to are required' }, { status: 400 });
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  const [reminders, emiPayments] = await Promise.all([
    prisma.reminder.findMany({
      where: {
        userId,
        dateTime: { gte: fromDate, lte: toDate },
      },
      orderBy: { dateTime: 'asc' },
    }),
    prisma.eMIPayment.findMany({
      where: {
        loan: { userId },
        dueDate: { gte: fromDate, lte: toDate },
      },
      include: {
        loan: { select: { title: true, platform: true, emiAmount: true } },
      },
      orderBy: { dueDate: 'asc' },
    }),
  ]);

  // Normalize into unified calendar events
  const events = [
    ...reminders.map((r) => ({
      id: r.id,
      type: 'reminder' as const,
      title: r.title,
      description: r.description,
      date: r.dateTime,
      status: r.status,
      category: r.category,
      priority: r.priority,
    })),
    ...emiPayments.map((e) => ({
      id: e.id,
      type: 'emi' as const,
      title: `EMI - ${e.loan.title}`,
      description: `${e.loan.platform} · Month ${e.month}`,
      date: e.dueDate,
      status: e.status,
      amount: e.amount,
      platform: e.loan.platform,
      paidDate: e.paidDate,
    })),
  ];

  return NextResponse.json({ success: true, data: events });
}
