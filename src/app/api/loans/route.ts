import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { z } from 'zod';

const loanSchema = z.object({
  platform: z.string().min(1, 'Platform is required').max(100),
  title: z.string().min(1, 'Title is required').max(200),
  totalAmount: z.number().positive('Total amount must be positive'),
  emiAmount: z.number().positive('EMI amount must be positive'),
  emiDate: z.number().int().min(1).max(31),
  startDate: z.string().min(1, 'Start date is required'),
  tenure: z.number().int().positive('Tenure must be positive'),
  notes: z.string().max(500).optional(),
});

// GET /api/loans — list user's loans
export async function GET(request: Request) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const where: Record<string, unknown> = { userId };
  if (status) where.status = status;

  const loans = await prisma.loan.findMany({
    where: where as any,
    include: {
      emiPayments: { orderBy: { month: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Compute derived fields
  // Total payable = emiAmount * tenure (principal + interest)
  const enrichedLoans = loans.map((loan) => {
    const paidEmis = loan.emiPayments.filter((e) => e.status === 'Paid').length;
    const totalPayable = loan.emiAmount * loan.tenure;
    const amountPaid = loan.emiAmount * paidEmis;
    const amountPending = Math.max(totalPayable - amountPaid, 0);
    const progressPercent = Math.min(
      Math.round((amountPaid / totalPayable) * 100),
      100
    );

    // Next EMI: first unpaid EMI
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

  return NextResponse.json({ success: true, data: enrichedLoans });
}

// POST /api/loans — create a new loan with EMI schedule
export async function POST(request: Request) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = loanSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = validated.data;
    const startDate = new Date(data.startDate);

    // Create loan with EMI payments in a transaction
    const loan = await prisma.$transaction(async (tx) => {
      const newLoan = await tx.loan.create({
        data: {
          platform: data.platform,
          title: data.title,
          totalAmount: data.totalAmount,
          emiAmount: data.emiAmount,
          emiDate: data.emiDate,
          startDate,
          tenure: data.tenure,
          notes: data.notes,
          userId,
        },
      });

      // Generate EMI payment schedule
      const emiPayments = [];
      for (let i = 0; i < data.tenure; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        dueDate.setDate(Math.min(data.emiDate, getDaysInMonth(dueDate)));

        emiPayments.push({
          amount: data.emiAmount,
          dueDate,
          status: 'Pending',
          month: i + 1,
          loanId: newLoan.id,
        });
      }

      await tx.eMIPayment.createMany({ data: emiPayments });

      return newLoan;
    });

    // Fetch complete loan with EMIs
    const completeLoan = await prisma.loan.findUnique({
      where: { id: loan.id },
      include: { emiPayments: { orderBy: { month: 'asc' } } },
    });

    return NextResponse.json({ success: true, data: completeLoan }, { status: 201 });
  } catch (error) {
    console.error('Create loan error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// Helper: get days in a given month
function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
