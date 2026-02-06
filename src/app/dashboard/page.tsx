'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { DashboardData } from '@/types';
import { formatDate, formatDateTime, formatCurrency, getRelativeTime } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetch('/api/dashboard')
        .then((res) => res.json())
        .then((res) => { if (res.success) setData(res.data); })
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (authLoading || !user) return null;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            {getGreeting()}, {user.name?.split(' ')[0]}
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5">Here&apos;s what&apos;s happening today</p>
        </div>

        {loading ? <DashboardSkeleton /> : data ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Pending" value={data.stats.pendingReminders} />
              <StatCard label="Done" value={data.stats.completedReminders} />
              <StatCard label="Active Loans" value={data.stats.activeLoans} />
              <StatCard label="Loan Pending" value={formatCurrency(data.stats.totalPending)} isText />
            </div>

            {/* Today's Reminders */}
            <section>
              <SectionHeader title="Today" action={{ label: 'View all', href: '/reminders' }} />
              {data.todayReminders.length === 0 ? (
                <Card className="text-center py-10">
                  <p className="text-zinc-400 text-sm">No reminders for today</p>
                  <Link href="/reminders/new">
                    <Button variant="outline" size="sm" className="mt-3">Add Reminder</Button>
                  </Link>
                </Card>
              ) : (
                <div className="space-y-2">
                  {data.todayReminders.map((r) => (
                    <Card key={r.id} hoverable onClick={() => router.push('/reminders')}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            r.status === 'Completed' ? 'bg-zinc-300' :
                            r.status === 'Missed' ? 'bg-red-400' : 'bg-zinc-900'
                          }`} />
                          <div className="min-w-0">
                            <p className="font-medium text-zinc-900 truncate text-sm">{r.title}</p>
                            <p className="text-xs text-zinc-400">{formatDateTime(r.dateTime)}</p>
                          </div>
                        </div>
                        <Badge variant={r.status === 'Completed' ? 'success' : r.status === 'Missed' ? 'danger' : 'default'}>
                          {r.status}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Upcoming */}
            {data.upcomingReminders.length > 0 && (
              <section>
                <SectionHeader title="This Week" />
                <div className="space-y-2">
                  {data.upcomingReminders.slice(0, 5).map((r) => (
                    <Card key={r.id} hoverable onClick={() => router.push('/reminders')}>
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="font-medium text-zinc-900 truncate text-sm">{r.title}</p>
                          <p className="text-xs text-zinc-400">{formatDate(r.dateTime)}</p>
                        </div>
                        <span className="text-xs text-zinc-400 flex-shrink-0 ml-3">{getRelativeTime(r.dateTime)}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Overdue */}
            {data.overdueReminders.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-red-500 mb-2 uppercase tracking-wide">Overdue</h2>
                <div className="space-y-2">
                  {data.overdueReminders.map((r) => (
                    <Card key={r.id} className="border-red-100">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="font-medium text-zinc-900 truncate text-sm">{r.title}</p>
                          <p className="text-xs text-red-400">{formatDateTime(r.dateTime)}</p>
                        </div>
                        <Badge variant="danger">Missed</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Active Loans */}
            <section>
              <SectionHeader title="Active Loans" action={{ label: 'View all', href: '/loans' }} />
              {data.activeLoans.length === 0 ? (
                <Card className="text-center py-10">
                  <p className="text-zinc-400 text-sm">No active loans</p>
                  <Link href="/loans/new">
                    <Button variant="outline" size="sm" className="mt-3">Add Loan</Button>
                  </Link>
                </Card>
              ) : (
                <div className="space-y-3">
                  {data.activeLoans.map((loan) => (
                    <Card key={loan.id} hoverable onClick={() => router.push(`/loans/${loan.id}`)}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-zinc-900 text-sm">{loan.title}</h3>
                          <p className="text-xs text-zinc-400">{loan.platform}</p>
                        </div>
                        <Badge variant={loan.status === 'Overdue' ? 'danger' : 'default'}>{loan.status}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                        <span>EMI {formatCurrency(loan.emiAmount)}</span>
                        <span>Next: {loan.nextEmiDate ? formatDate(loan.nextEmiDate) : 'N/A'}</span>
                      </div>
                      <ProgressBar percent={loan.progressPercent || 0} size="sm" />
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function SectionHeader({ title, action }: { title: string; action?: { label: string; href: string } }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">{title}</h2>
      {action && (
        <Link href={action.href} className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors">
          {action.label}
        </Link>
      )}
    </div>
  );
}

function StatCard({ label, value, isText }: { label: string; value: number | string; isText?: boolean }) {
  return (
    <Card>
      <p className="text-[10px] sm:text-[11px] text-zinc-400 uppercase tracking-wide font-medium">{label}</p>
      <p className={`${isText ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'} font-bold text-zinc-900 mt-0.5 sm:mt-1 truncate`}>{value}</p>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl skeleton" />)}
      </div>
      {[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-2xl skeleton" />)}
    </div>
  );
}
