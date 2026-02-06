# RemindPay - Reminder & Loan Management App

A full-stack Progressive Web App (PWA) for managing reminders and tracking loans/EMI payments. Works on Android, iOS, and desktop — installable without any App Store.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | SQLite (dev) / PostgreSQL (production) |
| ORM | Prisma |
| Auth | JWT + HttpOnly cookies (bcrypt) |
| Notifications | Web Push (VAPID) + Nodemailer emails |
| Deployment | Vercel |

## Features

- **Universal Reminders**: Create, edit, delete reminders with categories, priorities, and statuses
- **Loan Management**: Track loans with auto-generated EMI schedules
- **EMI Tracking**: Mark EMIs as paid, auto-calculate paid/pending amounts
- **Automated Alerts**: Email + push notifications at 15d, 7d, 1d, 12h, 4h, 1h before EMI
- **Dashboard**: Today's reminders, upcoming events, active loans, overdue alerts
- **Calendar View**: Visual calendar with reminder dots
- **PWA**: Install on any device, works offline
- **Responsive**: Mobile-first design, smooth animations

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Login & Register pages
│   ├── api/               # API Routes
│   │   ├── auth/          # Auth endpoints
│   │   ├── reminders/     # Reminder CRUD
│   │   ├── loans/         # Loan CRUD + EMI management
│   │   ├── notifications/ # Push subscription
│   │   ├── dashboard/     # Dashboard aggregation
│   │   └── cron/          # Scheduled notification job
│   ├── dashboard/         # Dashboard page
│   ├── reminders/         # Reminder pages (list, new, edit)
│   ├── loans/             # Loan pages (list, new, detail)
│   ├── calendar/          # Calendar view
│   └── settings/          # Settings & notification setup
├── components/
│   ├── ui/                # Reusable UI (Button, Card, Modal, etc.)
│   └── layout/            # AppLayout with navigation
├── hooks/                 # Custom React hooks
├── lib/                   # Core utilities (prisma, auth, email, notifications)
└── types/                 # TypeScript type definitions
```

## Setup Guide

### Prerequisites

- Node.js 18+
- npm or yarn

### 1. Clone & Install

```bash
cd reminder
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
# Database (SQLite for local dev)
DATABASE_URL="file:./dev.db"

# JWT Secret (generate a random string)
JWT_SECRET="your-super-secret-jwt-key-change-this-to-something-random"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Email (Gmail example - use an App Password, not your real password)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-gmail-app-password"
EMAIL_FROM="RemindPay <your-email@gmail.com>"

# Web Push VAPID Keys (generate with command below)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
VAPID_EMAIL="mailto:your-email@gmail.com"

# Cron Secret
CRON_SECRET="any-random-string-for-cron-auth"
```

#### Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

Copy the Public and Private keys into your `.env`.

#### Gmail App Password

1. Go to Google Account → Security → 2-Step Verification
2. At the bottom, click "App passwords"
3. Generate one for "Mail"
4. Use that 16-character password as `SMTP_PASS`

### 3. Initialize Database

```bash
npx prisma db push
```

This creates the SQLite database with all tables.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Create an Account

1. Go to `/register`
2. Create your account
3. Start adding reminders and loans!

## Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USER/reminder.git
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and import your repository
2. Add environment variables in Vercel dashboard:
   - All variables from `.env.example`
   - Change `DATABASE_URL` to a PostgreSQL URL (use [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app))

### 3. Switch to PostgreSQL for Production

Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Then run:

```bash
npx prisma db push
```

### 4. Vercel Cron

The `vercel.json` configures an hourly cron job at `/api/cron` to:
- Send email/push reminders for due items
- Send EMI reminders at scheduled intervals
- Mark missed reminders and overdue EMIs

## Installing on iPhone (Without App Store)

1. Open the app URL in **Safari** (not Chrome)
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Name it "RemindPay" and tap **Add**
5. The app icon appears on your home screen
6. Open it — it runs in standalone mode (no browser UI)
7. Enable notifications when prompted

## Installing on Android

1. Open the app URL in **Chrome**
2. You'll see an "Install app" banner, or:
3. Tap the **three-dot menu** → **"Install app"** or **"Add to Home Screen"**
4. The app icon appears on your home screen
5. Enable notifications when prompted

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/reminders` | List reminders (with filters) |
| POST | `/api/reminders` | Create reminder |
| GET | `/api/reminders/:id` | Get reminder |
| PUT | `/api/reminders/:id` | Update reminder |
| DELETE | `/api/reminders/:id` | Delete reminder |
| GET | `/api/loans` | List loans |
| POST | `/api/loans` | Create loan (auto-generates EMI schedule) |
| GET | `/api/loans/:id` | Get loan with EMI history |
| PUT | `/api/loans/:id` | Update loan |
| DELETE | `/api/loans/:id` | Delete loan |
| POST | `/api/loans/:id/emi` | Mark EMI as paid |
| POST | `/api/notifications/subscribe` | Save push subscription |
| GET | `/api/dashboard` | Get dashboard data |
| GET | `/api/cron?secret=...` | Run notification cron |

## EMI Notification Schedule

For each upcoming EMI, the system sends email + push notifications at:

| Timing | When |
|--------|------|
| 15 days before | Early heads-up |
| 7 days before | Week warning |
| 1 day before | Day before |
| 12 hours before | Half-day alert |
| 4 hours before | Urgent |
| 1 hour before | Final reminder |

## License

MIT
