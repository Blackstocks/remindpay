import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// POST /api/loans/:id/emi — mark an EMI as paid
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Verify loan ownership
  const loan = await prisma.loan.findFirst({
    where: { id: params.id, userId },
    include: { emiPayments: { orderBy: { month: 'asc' } } },
  });

  if (!loan) {
    return NextResponse.json({ success: false, error: 'Loan not found' }, { status: 404 });
  }

  const body = await request.json();
  const { emiId } = body;

  if (!emiId) {
    return NextResponse.json({ success: false, error: 'EMI ID required' }, { status: 400 });
  }

  // Find the EMI and verify it belongs to this loan
  const emi = loan.emiPayments.find((e) => e.id === emiId);
  if (!emi) {
    return NextResponse.json({ success: false, error: 'EMI not found' }, { status: 404 });
  }

  if (emi.status === 'Paid') {
    return NextResponse.json({ success: false, error: 'EMI already marked as paid' }, { status: 400 });
  }

  // Mark EMI as paid
  await prisma.eMIPayment.update({
    where: { id: emiId },
    data: { status: 'Paid', paidDate: new Date() },
  });

  // Check if all EMIs are paid → mark loan as Completed
  const paidCount = loan.emiPayments.filter((e) => e.status === 'Paid').length + 1;
  if (paidCount >= loan.tenure) {
    await prisma.loan.update({
      where: { id: loan.id },
      data: { status: 'Completed' },
    });
  }

  // Fetch updated loan
  const updatedLoan = await prisma.loan.findUnique({
    where: { id: loan.id },
    include: { emiPayments: { orderBy: { month: 'asc' } } },
  });

  const updatedPaid = updatedLoan!.emiPayments.filter((e) => e.status === 'Paid').length;
  const totalPayable = updatedLoan!.emiAmount * updatedLoan!.tenure;
  const amountPaid = updatedLoan!.emiAmount * updatedPaid;
  const amountPending = Math.max(totalPayable - amountPaid, 0);

  return NextResponse.json({
    success: true,
    data: {
      ...updatedLoan,
      totalPayable,
      amountPaid,
      amountPending,
      progressPercent: Math.min(Math.round((amountPaid / totalPayable) * 100), 100),
    },
  });
}
