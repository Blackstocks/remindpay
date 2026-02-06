import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// GET /api/dashboard — aggregated dashboard data
export async function GET(request: Request) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Parallel fetch all data
  const [
    todayReminders,
    upcomingReminders,
    overdueReminders,
    allReminders,
    loans,
  ] = await Promise.all([
    // Today's reminders
    prisma.reminder.findMany({
      where: {
        userId,
        dateTime: { gte: todayStart, lt: todayEnd },
      },
      orderBy: { dateTime: 'asc' },
    }),
    // Upcoming reminders (next 7 days)
    prisma.reminder.findMany({
      where: {
        userId,
        status: 'Pending',
        dateTime: { gte: todayEnd, lt: weekEnd },
      },
      orderBy: { dateTime: 'asc' },
      take: 10,
    }),
    // Overdue/missed reminders
    prisma.reminder.findMany({
      where: {
        userId,
        status: { in: ['Missed'] },
      },
      orderBy: { dateTime: 'desc' },
      take: 5,
    }),
    // All reminders stats
    prisma.reminder.groupBy({
      by: ['status'],
      where: { userId },
      _count: true,
    }),
    // Active loans with EMIs
    prisma.loan.findMany({
      where: { userId },
      include: {
        emiPayments: { orderBy: { month: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Compute stats
  const reminderStats = {
    totalReminders: allReminders.reduce((sum, s) => sum + s._count, 0),
    pendingReminders: allReminders.find((s) => s.status === 'Pending')?._count || 0,
    completedReminders: allReminders.find((s) => s.status === 'Completed')?._count || 0,
    missedReminders: allReminders.find((s) => s.status === 'Missed')?._count || 0,
  };

  // Enrich loans — pending = (emiAmount * tenure) - amountPaid (total payable incl. interest)
  const enrichedLoans = loans.map((loan) => {
    const paidEmis = loan.emiPayments.filter((e) => e.status === 'Paid').length;
    const totalPayable = loan.emiAmount * loan.tenure;
    const amountPaid = loan.emiAmount * paidEmis;
    const amountPending = Math.max(totalPayable - amountPaid, 0);
    const progressPercent = Math.min(
      Math.round((amountPaid / totalPayable) * 100),
      100
    );
    const nextEmi = loan.emiPayments.find((e) => e.status !== 'Paid');

    return {
      ...loan,
      totalPayable,
      amountPaid,
      amountPending,
      progressPercent,
      nextEmiDate: nextEmi?.dueDate || null,
    };
  });

  const activeLoans = enrichedLoans.filter((l) => l.status !== 'Completed');
  const totalPayableAll = enrichedLoans.reduce((sum, l) => sum + (l.totalPayable || 0), 0);
  const totalPaid = enrichedLoans.reduce((sum, l) => sum + (l.amountPaid || 0), 0);

  return NextResponse.json({
    success: true,
    data: {
      todayReminders,
      upcomingReminders,
      overdueReminders,
      activeLoans,
      allLoans: enrichedLoans,
      stats: {
        ...reminderStats,
        totalLoans: loans.length,
        activeLoans: activeLoans.length,
        totalLoanAmount: totalPayableAll,
        totalPaid,
        totalPending: totalPayableAll - totalPaid,
      },
    },
  });
}
