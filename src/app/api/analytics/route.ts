import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// GET /api/analytics — comprehensive analytics data
export async function GET(request: Request) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const [reminders, loans, emiPayments] = await Promise.all([
    prisma.reminder.findMany({ where: { userId } }),
    prisma.loan.findMany({ where: { userId } }),
    prisma.eMIPayment.findMany({
      where: { loan: { userId } },
      include: { loan: { select: { title: true, platform: true, totalAmount: true, emiAmount: true, tenure: true } } },
    }),
  ]);

  // ─── Reminder Analytics ────────────────────────────────
  const totalReminders = reminders.length;
  const completedReminders = reminders.filter((r) => r.status === 'Completed').length;
  const pendingReminders = reminders.filter((r) => r.status === 'Pending').length;
  const missedReminders = reminders.filter((r) => r.status === 'Missed').length;
  const completionRate = totalReminders > 0 ? Math.round((completedReminders / totalReminders) * 100) : 0;

  // Reminders by category
  const remindersByCategory: Record<string, number> = {};
  reminders.forEach((r) => {
    remindersByCategory[r.category] = (remindersByCategory[r.category] || 0) + 1;
  });

  // Reminders by priority
  const remindersByPriority: Record<string, number> = {};
  reminders.forEach((r) => {
    remindersByPriority[r.priority] = (remindersByPriority[r.priority] || 0) + 1;
  });

  // ─── Loan Analytics ────────────────────────────────────
  const totalLoans = loans.length;
  const activeLoans = loans.filter((l) => l.status === 'Active').length;
  const completedLoans = loans.filter((l) => l.status === 'Completed').length;
  const overdueLoans = loans.filter((l) => l.status === 'Overdue').length;

  const totalBorrowed = loans.reduce((s, l) => s + l.totalAmount, 0);
  const totalPayable = loans.reduce((s, l) => s + l.emiAmount * l.tenure, 0);
  const totalInterest = totalPayable - totalBorrowed;
  const avgInterestRate = totalBorrowed > 0 ? Math.round((totalInterest / totalBorrowed) * 10000) / 100 : 0;

  // Per-loan breakdown
  const loanBreakdown = loans.map((loan) => {
    const loanEmis = emiPayments.filter((e) => e.loanId === loan.id);
    const paidEmis = loanEmis.filter((e) => e.status === 'Paid').length;
    const totalEmis = loanEmis.length;
    const payable = loan.emiAmount * loan.tenure;
    const paid = loan.emiAmount * paidEmis;
    const interest = payable - loan.totalAmount;
    const interestPaid = paidEmis > 0 ? Math.round((interest / loan.tenure) * paidEmis) : 0;

    return {
      id: loan.id,
      title: loan.title,
      platform: loan.platform,
      status: loan.status,
      borrowed: loan.totalAmount,
      payable,
      paid,
      pending: Math.max(payable - paid, 0),
      interest,
      interestPaid,
      totalEmis,
      paidEmis,
      pendingEmis: totalEmis - paidEmis,
      progressPercent: totalEmis > 0 ? Math.round((paidEmis / totalEmis) * 100) : 0,
    };
  });

  // ─── EMI Analytics ─────────────────────────────────────
  const totalEmis = emiPayments.length;
  const paidEmis = emiPayments.filter((e) => e.status === 'Paid').length;
  const pendingEmis = emiPayments.filter((e) => e.status === 'Pending').length;
  const overdueEmis = emiPayments.filter((e) => e.status === 'Overdue').length;
  const emiCompletionRate = totalEmis > 0 ? Math.round((paidEmis / totalEmis) * 100) : 0;

  const totalEmiAmountPaid = emiPayments
    .filter((e) => e.status === 'Paid')
    .reduce((s, e) => s + e.amount, 0);

  // ─── Monthly Payment Trend (last 12 months) ───────────
  const now = new Date();
  const monthlyPayments: { month: string; amount: number; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    const monthEmis = emiPayments.filter((e) => {
      if (e.status !== 'Paid' || !e.paidDate) return false;
      const pd = new Date(e.paidDate);
      return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth();
    });
    monthlyPayments.push({
      month: monthLabel,
      amount: monthEmis.reduce((s, e) => s + e.amount, 0),
      count: monthEmis.length,
    });
  }

  // ─── Upcoming EMIs (next 30 days) ─────────────────────
  const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const upcomingEmis = emiPayments
    .filter((e) => e.status !== 'Paid' && new Date(e.dueDate) >= now && new Date(e.dueDate) <= next30)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 10)
    .map((e) => ({
      id: e.id,
      amount: e.amount,
      dueDate: e.dueDate,
      status: e.status,
      loanTitle: e.loan.title,
      platform: e.loan.platform,
    }));

  // ─── Platform-wise breakdown ───────────────────────────
  const platformMap: Record<string, { borrowed: number; payable: number; paid: number; count: number }> = {};
  loans.forEach((loan) => {
    const key = loan.platform;
    if (!platformMap[key]) platformMap[key] = { borrowed: 0, payable: 0, paid: 0, count: 0 };
    platformMap[key].borrowed += loan.totalAmount;
    platformMap[key].payable += loan.emiAmount * loan.tenure;
    platformMap[key].count += 1;
  });
  loanBreakdown.forEach((lb) => {
    const loan = loans.find((l) => l.id === lb.id);
    if (loan && platformMap[loan.platform]) {
      platformMap[loan.platform].paid += lb.paid;
    }
  });
  const platformBreakdown = Object.entries(platformMap).map(([platform, data]) => ({
    platform,
    ...data,
    interest: data.payable - data.borrowed,
  }));

  return NextResponse.json({
    success: true,
    data: {
      reminders: {
        total: totalReminders,
        completed: completedReminders,
        pending: pendingReminders,
        missed: missedReminders,
        completionRate,
        byCategory: remindersByCategory,
        byPriority: remindersByPriority,
      },
      loans: {
        total: totalLoans,
        active: activeLoans,
        completed: completedLoans,
        overdue: overdueLoans,
        totalBorrowed,
        totalPayable,
        totalInterest,
        avgInterestRate,
        totalPaid: totalEmiAmountPaid,
        totalPending: totalPayable - totalEmiAmountPaid,
        breakdown: loanBreakdown,
        platformBreakdown,
      },
      emis: {
        total: totalEmis,
        paid: paidEmis,
        pending: pendingEmis,
        overdue: overdueEmis,
        completionRate: emiCompletionRate,
        totalAmountPaid: totalEmiAmountPaid,
        upcoming: upcomingEmis,
      },
      monthlyPayments,
    },
  });
}
