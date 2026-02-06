import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  dateTime: z.string().optional(),
  category: z.enum(['Work', 'Meeting', 'Personal', 'Loan', 'Other']).optional(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  status: z.enum(['Pending', 'Completed', 'Missed']).optional(),
});

// GET /api/reminders/:id
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const reminder = await prisma.reminder.findFirst({
    where: { id: params.id, userId },
  });

  if (!reminder) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: reminder });
}

// PUT /api/reminders/:id
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Verify ownership
  const existing = await prisma.reminder.findFirst({
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

    const updateData: Record<string, unknown> = { ...validated.data };
    if (updateData.dateTime) {
      updateData.dateTime = new Date(updateData.dateTime as string);
    }

    const reminder = await prisma.reminder.update({
      where: { id: params.id },
      data: updateData as any,
    });

    return NextResponse.json({ success: true, data: reminder });
  } catch (error) {
    console.error('Update reminder error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/reminders/:id
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await prisma.reminder.findFirst({
    where: { id: params.id, userId },
  });
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  await prisma.reminder.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
