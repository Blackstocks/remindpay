'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import Card from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate } from '@/lib/utils';

interface AnalyticsData {
  reminders: {
    total: number;
    completed: number;
    pending: number;
    missed: number;
    completionRate: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  };
  loans: {
    total: number;
    active: number;
    completed: number;
    overdue: number;
    totalBorrowed: number;
    totalPayable: number;
    totalInterest: number;
    avgInterestRate: number;
    totalPaid: number;
    totalPending: number;
    breakdown: {
      id: string;
      title: string;
      platform: string;
      status: string;
      borrowed: number;
      payable: number;
      paid: number;
      pending: number;
      interest: number;
      interestPaid: number;
      totalEmis: number;
      paidEmis: number;
      pendingEmis: number;
      progressPercent: number;
    }[];
    platformBreakdown: {
      platform: string;
      borrowed: number;
      payable: number;
      paid: number;
      interest: number;
      count: number;
    }[];
  };
  emis: {
    total: number;
    paid: number;
    pending: number;
    overdue: number;
    completionRate: number;
    totalAmountPaid: number;
    upcoming: {
      id: string;
      amount: number;
      dueDate: string;
      status: string;
      loanTitle: string;
      platform: string;
    }[];
  };
  monthlyPayments: {
    month: string;
    amount: number;
    count: number;
  }[];
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'loans' | 'reminders'>('overview');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics');
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchAnalytics();
  }, [user, fetchAnalytics]);

  if (authLoading || !user) return null;

  return (
    <AppLayout>
      <div className="space-y-5 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Analytics</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Your financial overview and metrics</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['overview', 'loans', 'reminders'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-32 rounded-2xl skeleton" />)}
          </div>
        ) : !data ? (
          <Card><p className="text-zinc-400 text-sm text-center py-8">Failed to load analytics</p></Card>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab data={data} />}
            {activeTab === 'loans' && <LoansTab data={data} />}
            {activeTab === 'reminders' && <RemindersTab data={data} />}
          </>
        )}
      </div>
    </AppLayout>
  );
}

// ─── Overview Tab ────────────────────────────────────────────
function OverviewTab({ data }: { data: AnalyticsData }) {
  const maxPayment = Math.max(...data.monthlyPayments.map((m) => m.amount), 1);

  return (
    <div className="space-y-5">
      {/* Key Numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Borrowed" value={formatCurrency(data.loans.totalBorrowed)} />
        <StatCard label="Total Payable" value={formatCurrency(data.loans.totalPayable)} />
        <StatCard label="Total Paid" value={formatCurrency(data.loans.totalPaid)} />
        <StatCard label="Total Pending" value={formatCurrency(data.loans.totalPending)} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Interest" value={formatCurrency(data.loans.totalInterest)} sub="on all loans" />
        <StatCard label="Avg Interest %" value={`${data.loans.avgInterestRate}%`} sub="of principal" />
        <StatCard label="EMIs Paid" value={`${data.emis.paid} / ${data.emis.total}`} sub={`${data.emis.completionRate}% done`} />
        <StatCard label="Reminders Done" value={`${data.reminders.completed} / ${data.reminders.total}`} sub={`${data.reminders.completionRate}% rate`} />
      </div>

      {/* Monthly Payment Trend */}
      <Card>
        <h3 className="text-sm font-semibold text-zinc-900 mb-4">Monthly Payments (12 Months)</h3>
        {/* Horizontal bars for mobile, vertical bars for desktop */}
        <div className="sm:hidden space-y-2">
          {data.monthlyPayments.map((m, i) => {
            const widthPercent = maxPayment > 0 ? (m.amount / maxPayment) * 100 : 0;
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-400 w-12 text-right flex-shrink-0">{m.month}</span>
                <div className="flex-1 bg-zinc-100 rounded-full h-5 relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-zinc-900 rounded-full transition-all"
                    style={{ width: `${Math.max(widthPercent, m.amount > 0 ? 3 : 0)}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-500 font-medium w-16 text-right flex-shrink-0">
                  {m.amount > 0 ? formatCurrency(m.amount) : '-'}
                </span>
              </div>
            );
          })}
        </div>
        <div className="hidden sm:flex items-end gap-1.5 h-40">
          {data.monthlyPayments.map((m, i) => {
            const heightPercent = maxPayment > 0 ? (m.amount / maxPayment) * 100 : 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-zinc-400 font-medium">
                  {m.amount > 0 ? formatCurrency(m.amount) : ''}
                </span>
                <div className="w-full relative" style={{ height: '120px' }}>
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t transition-all"
                    style={{ height: `${Math.max(heightPercent, m.amount > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <span className="text-[9px] text-zinc-400">{m.month}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Upcoming EMIs */}
      {data.emis.upcoming.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-zinc-900 mb-3">Upcoming EMIs (Next 30 Days)</h3>
          <div className="divide-y divide-zinc-100">
            {data.emis.upcoming.map((emi) => (
              <div key={emi.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{emi.loanTitle}</p>
                  <p className="text-xs text-zinc-400">{emi.platform} &middot; Due {formatDate(emi.dueDate)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-zinc-900">{formatCurrency(emi.amount)}</p>
                  <p className={`text-[10px] font-medium ${emi.status === 'Overdue' ? 'text-red-500' : 'text-zinc-400'}`}>
                    {emi.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Platform Breakdown */}
      {data.loans.platformBreakdown.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-zinc-900 mb-3">By Platform / Lender</h3>
          <div className="divide-y divide-zinc-100">
            {data.loans.platformBreakdown.map((p) => (
              <div key={p.platform} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{p.platform}</p>
                    <p className="text-[11px] text-zinc-400">{p.count} loan{p.count !== 1 ? 's' : ''}</p>
                  </div>
                  <p className="text-sm font-semibold text-zinc-900">{formatCurrency(p.borrowed)}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[11px]">
                  <div>
                    <span className="text-zinc-400">Borrowed</span>
                    <p className="font-medium text-zinc-700">{formatCurrency(p.borrowed)}</p>
                  </div>
                  <div>
                    <span className="text-zinc-400">Payable</span>
                    <p className="font-medium text-zinc-700">{formatCurrency(p.payable)}</p>
                  </div>
                  <div>
                    <span className="text-zinc-400">Paid</span>
                    <p className="font-medium text-zinc-700">{formatCurrency(p.paid)}</p>
                  </div>
                  <div>
                    <span className="text-zinc-400">Interest</span>
                    <p className="font-medium text-zinc-700">{formatCurrency(p.interest)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Loans Tab ───────────────────────────────────────────────
function LoansTab({ data }: { data: AnalyticsData }) {
  return (
    <div className="space-y-5">
      {/* Loan Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Loans" value={String(data.loans.total)} />
        <StatCard label="Active" value={String(data.loans.active)} />
        <StatCard label="Completed" value={String(data.loans.completed)} />
        <StatCard label="Overdue" value={String(data.loans.overdue)} highlight={data.loans.overdue > 0} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Total Borrowed" value={formatCurrency(data.loans.totalBorrowed)} />
        <StatCard label="Total Interest" value={formatCurrency(data.loans.totalInterest)} />
        <StatCard label="Interest Rate" value={`${data.loans.avgInterestRate}%`} sub="avg across loans" />
      </div>

      {/* Per-Loan Breakdown — Cards on mobile, table on desktop */}
      {data.loans.breakdown.length > 0 && (
        <>
          {/* Mobile: card layout */}
          <div className="sm:hidden space-y-3">
            <h3 className="text-sm font-semibold text-zinc-900">Loan-wise Breakdown</h3>
            {data.loans.breakdown.map((loan) => (
              <Card key={loan.id}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{loan.title}</p>
                    <p className="text-[11px] text-zinc-400">{loan.platform}</p>
                  </div>
                  <span className="text-[10px] font-medium text-zinc-500">{loan.paidEmis}/{loan.totalEmis} EMIs</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] mb-2">
                  <div>
                    <span className="text-zinc-400">Borrowed</span>
                    <p className="font-semibold text-zinc-900">{formatCurrency(loan.borrowed)}</p>
                  </div>
                  <div>
                    <span className="text-zinc-400">Interest</span>
                    <p className="font-semibold text-zinc-900">{formatCurrency(loan.interest)}</p>
                  </div>
                  <div>
                    <span className="text-zinc-400">Payable</span>
                    <p className="font-semibold text-zinc-900">{formatCurrency(loan.payable)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
                  <div>
                    <span className="text-zinc-400">Paid</span>
                    <p className="font-semibold text-zinc-900">{formatCurrency(loan.paid)}</p>
                  </div>
                  <div>
                    <span className="text-zinc-400">Pending</span>
                    <p className="font-semibold text-zinc-900">{formatCurrency(loan.pending)}</p>
                  </div>
                </div>
                <div className="w-full bg-zinc-100 rounded-full h-1.5">
                  <div className="bg-zinc-900 h-1.5 rounded-full" style={{ width: `${loan.progressPercent}%` }} />
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop: table layout */}
          <Card className="hidden sm:block">
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">Loan-wise Breakdown</h3>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-zinc-400 uppercase tracking-wider border-b border-zinc-100">
                    <th className="text-left py-2 pr-3 font-medium">Loan</th>
                    <th className="text-right py-2 px-2 font-medium">Borrowed</th>
                    <th className="text-right py-2 px-2 font-medium">Interest</th>
                    <th className="text-right py-2 px-2 font-medium">Payable</th>
                    <th className="text-right py-2 px-2 font-medium">Paid</th>
                    <th className="text-right py-2 px-2 font-medium">Pending</th>
                    <th className="text-right py-2 pl-2 font-medium">EMIs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {data.loans.breakdown.map((loan) => (
                    <tr key={loan.id} className="text-zinc-700">
                      <td className="py-2.5 pr-3">
                        <p className="font-medium text-zinc-900 truncate max-w-[120px]">{loan.title}</p>
                        <p className="text-zinc-400">{loan.platform}</p>
                      </td>
                      <td className="text-right py-2.5 px-2 font-medium">{formatCurrency(loan.borrowed)}</td>
                      <td className="text-right py-2.5 px-2 font-medium">{formatCurrency(loan.interest)}</td>
                      <td className="text-right py-2.5 px-2 font-medium">{formatCurrency(loan.payable)}</td>
                      <td className="text-right py-2.5 px-2 font-medium">{formatCurrency(loan.paid)}</td>
                      <td className="text-right py-2.5 px-2 font-medium">{formatCurrency(loan.pending)}</td>
                      <td className="text-right py-2.5 pl-2">
                        <span className="font-medium">{loan.paidEmis}/{loan.totalEmis}</span>
                        <div className="w-full bg-zinc-100 rounded-full h-1 mt-1">
                          <div className="bg-zinc-900 h-1 rounded-full" style={{ width: `${loan.progressPercent}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {data.loans.breakdown.length > 1 && (
                  <tfoot>
                    <tr className="border-t border-zinc-200 text-zinc-900 font-semibold">
                      <td className="py-2.5 pr-3">Total</td>
                      <td className="text-right py-2.5 px-2">{formatCurrency(data.loans.totalBorrowed)}</td>
                      <td className="text-right py-2.5 px-2">{formatCurrency(data.loans.totalInterest)}</td>
                      <td className="text-right py-2.5 px-2">{formatCurrency(data.loans.totalPayable)}</td>
                      <td className="text-right py-2.5 px-2">{formatCurrency(data.loans.totalPaid)}</td>
                      <td className="text-right py-2.5 px-2">{formatCurrency(data.loans.totalPending)}</td>
                      <td className="text-right py-2.5 pl-2">{data.emis.paid}/{data.emis.total}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Interest Breakdown */}
      {data.loans.breakdown.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-zinc-900 mb-3">Interest per Loan</h3>
          <div className="space-y-3">
            {data.loans.breakdown.map((loan) => {
              const interestPercent = loan.borrowed > 0 ? Math.round((loan.interest / loan.borrowed) * 100) : 0;
              return (
                <div key={loan.id}>
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs sm:text-sm font-medium text-zinc-900 truncate">{loan.title}</span>
                      <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 flex-shrink-0">{interestPercent}%</span>
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-zinc-700 flex-shrink-0">{formatCurrency(loan.interest)}</span>
                  </div>
                  <div className="w-full bg-zinc-100 rounded-full h-2">
                    <div
                      className="bg-zinc-900 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(interestPercent, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Reminders Tab ───────────────────────────────────────────
function RemindersTab({ data }: { data: AnalyticsData }) {
  const categories = Object.entries(data.reminders.byCategory);
  const priorities = Object.entries(data.reminders.byPriority);
  const maxCat = Math.max(...categories.map(([, v]) => v), 1);

  return (
    <div className="space-y-5">
      {/* Reminder Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={String(data.reminders.total)} />
        <StatCard label="Completed" value={String(data.reminders.completed)} />
        <StatCard label="Pending" value={String(data.reminders.pending)} />
        <StatCard label="Missed" value={String(data.reminders.missed)} highlight={data.reminders.missed > 0} />
      </div>

      {/* Completion Rate Ring */}
      <Card>
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#f4f4f5" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none" stroke="#18181b" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${data.reminders.completionRate * 2.64} 264`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-zinc-900">{data.reminders.completionRate}%</span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Completion Rate</h3>
            <p className="text-xs text-zinc-400 mt-1">
              {data.reminders.completed} of {data.reminders.total} reminders completed
            </p>
            {data.reminders.missed > 0 && (
              <p className="text-xs text-red-500 mt-0.5">{data.reminders.missed} missed</p>
            )}
          </div>
        </div>
      </Card>

      {/* By Category */}
      {categories.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-zinc-900 mb-3">By Category</h3>
          <div className="space-y-2.5">
            {categories.map(([cat, count]) => (
              <div key={cat}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-zinc-700">{cat}</span>
                  <span className="text-sm font-medium text-zinc-900">{count}</span>
                </div>
                <div className="w-full bg-zinc-100 rounded-full h-2">
                  <div
                    className="bg-zinc-900 h-2 rounded-full transition-all"
                    style={{ width: `${(count / maxCat) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* By Priority */}
      {priorities.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-zinc-900 mb-3">By Priority</h3>
          <div className="grid grid-cols-3 gap-3">
            {priorities.map(([priority, count]) => (
              <div key={priority} className="text-center bg-zinc-50 rounded-xl py-3 px-2">
                <p className="text-2xl font-bold text-zinc-900">{count}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">{priority}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Stat Card Component ─────────────────────────────────────
function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <Card>
      <p className="text-[9px] sm:text-[10px] text-zinc-400 uppercase tracking-wider font-medium">{label}</p>
      <p className={`text-sm sm:text-base font-bold mt-0.5 sm:mt-1 truncate ${highlight ? 'text-red-600' : 'text-zinc-900'}`}>{value}</p>
      {sub && <p className="text-[9px] sm:text-[10px] text-zinc-400 mt-0.5">{sub}</p>}
    </Card>
  );
}
