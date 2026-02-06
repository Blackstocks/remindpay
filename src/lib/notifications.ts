import webPush from 'web-push';

// Configure VAPID keys for push notifications
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@reminder.app',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Send push notification to a single subscription
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload
) {
  try {
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload)
    );
    return { success: true };
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    console.error('Push notification failed:', error);
    // If subscription is expired/invalid, return special flag
    if (statusCode === 410 || statusCode === 404) {
      return { success: false, expired: true };
    }
    return { success: false, expired: false };
  }
}

// EMI reminder schedule: intervals before due date (in hours)
export const EMI_REMINDER_INTERVALS = [
  { hours: 15 * 24, label: '15 days before' },
  { hours: 7 * 24, label: '7 days before' },
  { hours: 24, label: '1 day before' },
  { hours: 12, label: '12 hours before' },
  { hours: 4, label: '4 hours before' },
  { hours: 1, label: '1 hour before' },
];
