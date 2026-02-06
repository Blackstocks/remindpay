import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail, reminderEmailTemplate, emiReminderEmailTemplate } from '@/lib/email';
import { sendPushNotification, EMI_REMINDER_INTERVALS } from '@/lib/notifications';
import { formatDate, formatCurrency } from '@/lib/utils';
import { syncAllAccounts } from '@/lib/google';

// This cron endpoint runs periodically (e.g., every hour via Vercel Cron)
// It handles:
// 1. Sending reminder notifications (email + push) when reminders are due
// 2. Sending EMI reminders at scheduled intervals before due dates
// 3. Marking missed reminders and overdue EMIs

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  let emailsSent = 0;
  let pushSent = 0;
  let remindersUpdated = 0;

  try {
    // ─── 1. Process Due Reminders ──────────────────────────────
    const dueReminders = await prisma.reminder.findMany({
      where: {
        status: 'Pending',
        dateTime: { lte: now },
      },
      include: { user: { select: { name: true, email: true, id: true } } },
    });

    for (const reminder of dueReminders) {
      // Send email notification
      const html = reminderEmailTemplate({
        userName: reminder.user.name,
        title: reminder.title,
        description: reminder.description || undefined,
        dateTime: formatDate(reminder.dateTime),
        category: reminder.category,
        priority: reminder.priority,
      });

      const emailResult = await sendEmail({
        to: reminder.user.email,
        subject: `Reminder: ${reminder.title}`,
        html,
      });

      if (emailResult.success) emailsSent++;

      // Send push notifications
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId: reminder.user.id },
      });

      for (const sub of subscriptions) {
        const result = await sendPushNotification(sub, {
          title: `Reminder: ${reminder.title}`,
          body: reminder.description || `Due: ${formatDate(reminder.dateTime)}`,
          url: '/reminders',
          tag: `reminder-${reminder.id}`,
        });

        if (result.success) pushSent++;
        if (result.expired) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }

      // Log notification
      await prisma.notificationLog.create({
        data: {
          type: 'email',
          recipient: reminder.user.email,
          subject: `Reminder: ${reminder.title}`,
          status: emailResult.success ? 'sent' : 'failed',
          relatedId: reminder.id,
          relatedType: 'reminder',
        },
      });
    }

    // ─── 2. Mark Missed Reminders ──────────────────────────────
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const missed = await prisma.reminder.updateMany({
      where: {
        status: 'Pending',
        dateTime: { lt: oneHourAgo },
      },
      data: { status: 'Missed' },
    });
    remindersUpdated = missed.count;

    // ─── 3. Process EMI Reminders ──────────────────────────────
    const activeLoans = await prisma.loan.findMany({
      where: { status: 'Active' },
      include: {
        user: { select: { name: true, email: true, id: true } },
        emiPayments: {
          where: { status: { not: 'Paid' } },
          orderBy: { dueDate: 'asc' },
          take: 1,
        },
      },
    });

    for (const loan of activeLoans) {
      const nextEmi = loan.emiPayments[0];
      if (!nextEmi) continue;

      const hoursUntilDue =
        (nextEmi.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Check if we should send a notification based on intervals
      for (const interval of EMI_REMINDER_INTERVALS) {
        const windowStart = interval.hours - 0.5; // 30-min window
        const windowEnd = interval.hours + 0.5;

        if (hoursUntilDue >= windowStart && hoursUntilDue <= windowEnd) {
          // Check if we already sent this notification
          const alreadySent = await prisma.notificationLog.findFirst({
            where: {
              relatedId: nextEmi.id,
              relatedType: 'emi',
              subject: { contains: interval.label },
              sentAt: { gte: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
            },
          });

          if (alreadySent) break;

          // Calculate paid amount
          const allEmis = await prisma.eMIPayment.findMany({
            where: { loanId: loan.id },
          });
          const paidCount = allEmis.filter((e) => e.status === 'Paid').length;
          const amountPaid = loan.emiAmount * paidCount;
          const amountPending = loan.totalAmount - amountPaid;

          // Send email
          const html = emiReminderEmailTemplate({
            userName: loan.user.name,
            loanTitle: loan.title,
            platform: loan.platform,
            emiAmount: loan.emiAmount,
            dueDate: formatDate(nextEmi.dueDate),
            pendingBalance: amountPending,
            totalAmount: loan.totalAmount,
            paidAmount: amountPaid,
            timeUntilDue: interval.label,
          });

          const emailResult = await sendEmail({
            to: loan.user.email,
            subject: `EMI Reminder (${interval.label}): ${loan.title} - ${formatCurrency(loan.emiAmount)}`,
            html,
          });

          if (emailResult.success) emailsSent++;

          // Send push
          const subscriptions = await prisma.pushSubscription.findMany({
            where: { userId: loan.user.id },
          });

          for (const sub of subscriptions) {
            const result = await sendPushNotification(sub, {
              title: `EMI Due ${interval.label}`,
              body: `${loan.title}: ${formatCurrency(loan.emiAmount)} due on ${formatDate(nextEmi.dueDate)}`,
              url: `/loans/${loan.id}`,
              tag: `emi-${nextEmi.id}-${interval.hours}`,
            });
            if (result.success) pushSent++;
            if (result.expired) {
              await prisma.pushSubscription.delete({ where: { id: sub.id } });
            }
          }

          // Log
          await prisma.notificationLog.create({
            data: {
              type: 'email',
              recipient: loan.user.email,
              subject: `EMI Reminder (${interval.label}): ${loan.title}`,
              status: emailResult.success ? 'sent' : 'failed',
              relatedId: nextEmi.id,
              relatedType: 'emi',
            },
          });

          break; // Only send one notification per check
        }
      }

      // Mark overdue EMIs
      if (hoursUntilDue < 0) {
        await prisma.eMIPayment.updateMany({
          where: {
            loanId: loan.id,
            status: 'Pending',
            dueDate: { lt: now },
          },
          data: { status: 'Overdue' },
        });

        // Update loan status if any EMI is overdue
        await prisma.loan.update({
          where: { id: loan.id },
          data: { status: 'Overdue' },
        });
      }
    }

    // ─── 4. Sync Google Calendar Events ──────────────────────────
    const googleSync = await syncAllAccounts();

    return NextResponse.json({
      success: true,
      summary: {
        emailsSent,
        pushSent,
        remindersMissed: remindersUpdated,
        loansProcessed: activeLoans.length,
        googleAccountsSynced: googleSync.synced,
        googleSyncFailed: googleSync.failed,
      },
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json({ success: false, error: 'Cron job failed' }, { status: 500 });
  }
}
