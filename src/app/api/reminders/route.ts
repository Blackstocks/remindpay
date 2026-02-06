import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { z } from 'zod';

const reminderSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  dateTime: z.string().min(1, 'Date & time is required'),
  category: z.enum(['Work', 'Meeting', 'Personal', 'Loan', 'Other']),
  priority: z.enum(['Low', 'Medium', 'High']),
});

// GET /api/reminders — list user's reminders with filtering
export async function GET(request: Request) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const category = searchParams.get('category');
  const priority = searchParams.get('priority');
  const search = searchParams.get('search');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const where: Record<string, unknown> = { userId };
  if (status) where.status = status;
  if (category) where.category = category;
  if (priority) where.priority = priority;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
    ];
  }
  if (from || to) {
    where.dateTime = {};
    if (from) (where.dateTime as Record<string, unknown>).gte = new Date(from);
    if (to) (where.dateTime as Record<string, unknown>).lte = new Date(to);
  }

  const reminders = await prisma.reminder.findMany({
    where: where as any,
    orderBy: { dateTime: 'asc' },
  });

  return NextResponse.json({ success: true, data: reminders });
}

// POST /api/reminders — create a new reminder
export async function POST(request: Request) {
  const userId = await authenticateRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = reminderSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const reminder = await prisma.reminder.create({
      data: {
        ...validated.data,
        dateTime: new Date(validated.data.dateTime),
        userId,
      },
    });

    return NextResponse.json({ success: true, data: reminder }, { status: 201 });
  } catch (error) {
    console.error('Create reminder error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
