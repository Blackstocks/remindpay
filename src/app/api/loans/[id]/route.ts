import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { z } from 'zod';

const updateSchema = z.object({
  platform: z.string().min(1).max(100).optional(),
  title: z.string().min(1).max(200).optional(),
  emiDate: z.number().int().min(1).max(31).optional(),
  notes: z.string().max(500).optional().nullable(),
  status: z.enum(['Active', 'Completed', 'Overdue']).optional(),
});

// GET /api/loans/:id
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const loan = await prisma.loan.findFirst({
    where: { id: params.id, userId },
    include: {
      emiPayments: { orderBy: { month: 'asc' } },
    },
  });

  if (!loan) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  const paidEmis = loan.emiPayments.filter((e) => e.status === 'Paid').length;
  const totalPayable = loan.emiAmount * loan.tenure;
  const amountPaid = loan.emiAmount * paidEmis;
  const amountPending = Math.max(totalPayable - amountPaid, 0);
  const progressPercent = Math.min(Math.round((amountPaid / totalPayable) * 100), 100);
  const nextEmi = loan.emiPayments.find((e) => e.status !== 'Paid');

  return NextResponse.json({
    success: true,
    data: {
      ...loan,
      totalPayable,
      amountPaid,
      amountPending,
      progressPercent,
      nextEmiDate: nextEmi?.dueDate || null,
    },
  });
}

// PUT /api/loans/:id
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await prisma.loan.findFirst({
    where: { id: params.id, userId },
  });
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const validated = updateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const loan = await prisma.loan.update({
      where: { id: params.id },
      data: validated.data,
      include: { emiPayments: { orderBy: { month: 'asc' } } },
    });

    return NextResponse.json({ success: true, data: loan });
  } catch (error) {
    console.error('Update loan error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/loans/:id
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await prisma.loan.findFirst({
    where: { id: params.id, userId },
  });
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  await prisma.loan.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
