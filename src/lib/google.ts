import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/** Generate the Google OAuth consent URL */
export function getAuthUrl(state: string): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
  });
}

/** Exchange an authorization code for tokens and return the authenticated client + email */
export async function exchangeCode(code: string) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  // Get the user's email
  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const { data } = await oauth2.userinfo.get();

  return {
    email: data.email!,
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token!,
    tokenExpiry: new Date(tokens.expiry_date!),
  };
}

/** Get an authenticated OAuth2 client for a stored GoogleAccount, refreshing if needed */
async function getAuthenticatedClient(accountId: string) {
  const account = await prisma.googleAccount.findUnique({ where: { id: accountId } });
  if (!account) throw new Error('Google account not found');

  const client = getOAuth2Client();
  client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
    expiry_date: account.tokenExpiry.getTime(),
  });

  // If token is expired or about to expire (within 5 minutes), refresh
  if (account.tokenExpiry.getTime() < Date.now() + 5 * 60 * 1000) {
    const { credentials } = await client.refreshAccessToken();
    await prisma.googleAccount.update({
      where: { id: accountId },
      data: {
        accessToken: credentials.access_token!,
        tokenExpiry: new Date(credentials.expiry_date!),
        ...(credentials.refresh_token ? { refreshToken: credentials.refresh_token } : {}),
      },
    });
    client.setCredentials(credentials);
  }

  return client;
}

/** Sync calendar events for a single Google account */
export async function syncCalendarEvents(accountId: string) {
  const client = await getAuthenticatedClient(accountId);
  const calendar = google.calendar({ version: 'v3', auth: client });

  // Fetch events: past 1 month to future 3 months
  const now = new Date();
  const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const timeMax = new Date(now.getFullYear(), now.getMonth() + 4, 0);

  let allEvents: Array<{
    googleEventId: string;
    title: string;
    description: string | null;
    startTime: Date;
    endTime: Date;
    location: string | null;
    meetLink: string | null;
    organizer: string | null;
    htmlLink: string | null;
    status: string;
  }> = [];

  let pageToken: string | undefined;
  do {
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
      pageToken,
    });

    const items = res.data.items || [];
    for (const item of items) {
      if (!item.id) continue;
      const start = item.start?.dateTime || item.start?.date;
      const end = item.end?.dateTime || item.end?.date;
      if (!start || !end) continue;

      allEvents.push({
        googleEventId: item.id,
        title: item.summary || '(No title)',
        description: item.description || null,
        startTime: new Date(start),
        endTime: new Date(end),
        location: item.location || null,
        meetLink: item.hangoutLink || null,
        organizer: item.organizer?.email || null,
        htmlLink: item.htmlLink || null,
        status: item.status || 'confirmed',
      });
    }

    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);

  // Upsert all events
  for (const event of allEvents) {
    await prisma.googleCalendarEvent.upsert({
      where: {
        googleAccountId_googleEventId: {
          googleAccountId: accountId,
          googleEventId: event.googleEventId,
        },
      },
      create: {
        googleAccountId: accountId,
        ...event,
      },
      update: {
        title: event.title,
        description: event.description,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        meetLink: event.meetLink,
        organizer: event.organizer,
        htmlLink: event.htmlLink,
        status: event.status,
      },
    });
  }

  // Remove events that no longer exist in Google Calendar
  const syncedIds = allEvents.map((e) => e.googleEventId);
  if (syncedIds.length > 0) {
    await prisma.googleCalendarEvent.deleteMany({
      where: {
        googleAccountId: accountId,
        googleEventId: { notIn: syncedIds },
        startTime: { gte: timeMin, lte: timeMax },
      },
    });
  }

  // Update last sync time
  await prisma.googleAccount.update({
    where: { id: accountId },
    data: { lastSyncAt: new Date() },
  });

  return allEvents.length;
}

/** Sync all Google accounts for a specific user */
export async function syncUserAccounts(userId: string) {
  const accounts = await prisma.googleAccount.findMany({ where: { userId } });
  let totalSynced = 0;
  for (const account of accounts) {
    try {
      totalSynced += await syncCalendarEvents(account.id);
    } catch (err) {
      console.error(`Failed to sync Google account ${account.email}:`, err);
    }
  }
  return totalSynced;
}

/** Sync all Google accounts across all users (for cron) */
export async function syncAllAccounts() {
  const accounts = await prisma.googleAccount.findMany();
  let synced = 0;
  let failed = 0;
  for (const account of accounts) {
    try {
      await syncCalendarEvents(account.id);
      synced++;
    } catch (err) {
      console.error(`Cron: failed to sync Google account ${account.email}:`, err);
      failed++;
    }
  }
  return { synced, failed };
}
