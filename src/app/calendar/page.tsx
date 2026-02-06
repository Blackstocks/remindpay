'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { formatDateTime, formatCurrency, formatDate, cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  type: 'reminder' | 'emi';
  title: string;
  description?: string | null;
  date: string;
  status: string;
  category?: string;
  priority?: string;
  amount?: number;
  platform?: string;
  paidDate?: string | null;
}

export default function CalendarPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const fetchMonthEvents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const from = new Date(currentYear, currentMonth, 1).toISOString();
      const to = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();
      const res = await fetch(`/api/calendar?from=${from}&to=${to}`);
      const data = await res.json();
      if (data.success) setEvents(data.data);
    } catch (err) {
      console.error('Failed to fetch calendar events:', err);
    } finally {
      setLoading(false);
    }
  }, [user, currentYear, currentMonth]);

  useEffect(() => {
    fetchMonthEvents();
  }, [fetchMonthEvents]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((e) => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [events]);

  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
    for (let i = 1; i <= daysInMonth; i++) cells.push(i);
    return cells;
  }, [currentYear, currentMonth]);

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const monthLabel = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [currentYear, currentMonth]);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentYear((y) => y - 1); setCurrentMonth(11); }
    else { setCurrentMonth((m) => m - 1); }
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentYear((y) => y + 1); setCurrentMonth(0); }
    else { setCurrentMonth((m) => m + 1); }
  };

  const makeDateStr = (day: number) =>
    `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] || []) : [];

  const selectedDateLabel = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : '';

  // Month summary
  const monthReminders = events.filter((e) => e.type === 'reminder').length;
  const monthEmis = events.filter((e) => e.type === 'emi').length;
  const monthEmiAmount = events
    .filter((e) => e.type === 'emi' && e.status !== 'Paid')
    .reduce((s, e) => s + (e.amount || 0), 0);

  if (authLoading || !user) return null;

  return (
    <AppLayout>
      <div className="space-y-4 animate-fade-in">
        <h1 className="text-2xl font-bold text-zinc-900">Calendar</h1>

        {/* Month summary strip */}
        {!loading && events.length > 0 && (
          <div className="flex gap-2 overflow-x-auto">
            <div className="flex items-center gap-1.5 bg-zinc-100 rounded-lg px-3 py-1.5 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-zinc-900" />
              <span className="text-xs font-medium text-zinc-700">{monthReminders} reminder{monthReminders !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-red-50 rounded-lg px-3 py-1.5 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs font-medium text-red-700">{monthEmis} EMI{monthEmis !== 1 ? 's' : ''}</span>
            </div>
            {monthEmiAmount > 0 && (
              <div className="flex items-center bg-zinc-50 rounded-lg px-3 py-1.5 flex-shrink-0">
                <span className="text-xs font-medium text-zinc-600">Due: {formatCurrency(monthEmiAmount)}</span>
              </div>
            )}
          </div>
        )}

        <Card className="!p-1.5 sm:!p-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3 px-1">
            <button onClick={prevMonth} className="p-2 hover:bg-zinc-100 active:bg-zinc-200 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-base font-semibold text-zinc-900">{monthLabel}</h2>
            <button onClick={nextMonth} className="p-2 hover:bg-zinc-100 active:bg-zinc-200 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-0.5">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
              <div key={i} className="text-center text-[10px] font-semibold text-zinc-400 py-1.5 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-[3px] sm:gap-1">
            {calendarDays.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} className="aspect-square" />;

              const dateStr = makeDateStr(day);
              const dayEvents = eventsByDate[dateStr] || [];
              const reminders = dayEvents.filter((e) => e.type === 'reminder');
              const emis = dayEvents.filter((e) => e.type === 'emi');
              const hasReminders = reminders.length > 0;
              const hasEmis = emis.length > 0;
              const hasEvents = dayEvents.length > 0;
              const isToday = dateStr === todayStr;
              const hasOverdue = dayEvents.some((e) => e.status === 'Overdue' || e.status === 'Missed');
              const allDone = hasEvents && dayEvents.every((e) => e.status === 'Paid' || e.status === 'Completed');

              // Cell background color
              let cellBg = '';
              let cellText = 'text-zinc-700';
              let cellBorder = 'border border-transparent';

              if (hasEvents) {
                if (allDone) {
                  cellBg = 'bg-zinc-100';
                  cellText = 'text-zinc-400';
                } else if (hasOverdue) {
                  cellBg = 'bg-red-50';
                  cellText = 'text-red-700';
                  cellBorder = 'border border-red-200';
                } else if (hasEmis && hasReminders) {
                  cellBg = 'bg-zinc-900';
                  cellText = 'text-white';
                } else if (hasEmis) {
                  cellBg = 'bg-red-500';
                  cellText = 'text-white';
                } else {
                  cellBg = 'bg-zinc-800';
                  cellText = 'text-white';
                }
              }

              if (isToday && !hasEvents) {
                cellBorder = 'border-2 border-zinc-900';
                cellText = 'text-zinc-900 font-bold';
              } else if (isToday && hasEvents) {
                cellBorder = 'ring-2 ring-zinc-900 ring-offset-1';
              }

              return (
                <button
                  key={dateStr}
                  onClick={() => hasEvents ? setSelectedDate(dateStr) : null}
                  className={cn(
                    'relative aspect-square rounded-lg flex flex-col items-center justify-center transition-all duration-100',
                    cellBg, cellText, cellBorder,
                    hasEvents && 'active:scale-95 cursor-pointer',
                    !hasEvents && 'cursor-default',
                  )}
                >
                  <span className="text-[13px] leading-none font-medium">{day}</span>
                  {/* Mini info under the date number */}
                  {hasEvents && (
                    <span className={cn(
                      'text-[8px] leading-none mt-0.5 font-medium',
                      allDone ? 'text-zinc-400' :
                      (cellBg.includes('900') || cellBg.includes('red-500')) ? 'text-white/70' :
                      hasOverdue ? 'text-red-500' : 'text-zinc-500'
                    )}>
                      {emis.length > 0 && reminders.length > 0
                        ? `${emis.length}E·${reminders.length}R`
                        : emis.length > 0
                          ? `${emis.length} EMI`
                          : `${reminders.length}R`
                      }
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-3 mt-3 pt-2 border-t border-zinc-100">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-zinc-800" />
              <span className="text-[10px] text-zinc-400">Reminder</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-[10px] text-zinc-400">EMI</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-50 border border-red-200" />
              <span className="text-[10px] text-zinc-400">Overdue</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-zinc-100" />
              <span className="text-[10px] text-zinc-400">Done</span>
            </div>
          </div>
        </Card>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      <Modal
        isOpen={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        title={selectedDateLabel}
      >
        {selectedEvents.length === 0 ? (
          <p className="text-zinc-400 text-sm text-center py-6">No events for this day</p>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {/* EMI events first */}
            {selectedEvents.filter((e) => e.type === 'emi').map((event) => (
              <EmiEventDetail key={event.id} event={event} />
            ))}
            {/* Then reminders */}
            {selectedEvents.filter((e) => e.type === 'reminder').map((event) => (
              <ReminderEventDetail key={event.id} event={event} />
            ))}
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}

function EmiEventDetail({ event }: { event: CalendarEvent }) {
  const isPaid = event.status === 'Paid';
  const isOverdue = event.status === 'Overdue';

  return (
    <div className={cn(
      'rounded-xl p-3 border',
      isPaid ? 'bg-zinc-50 border-zinc-100 opacity-60' :
      isOverdue ? 'bg-red-50 border-red-200' :
      'bg-white border-zinc-200'
    )}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
            isPaid ? 'bg-zinc-900 text-white' :
            isOverdue ? 'bg-red-500 text-white' :
            'bg-red-100 text-red-600'
          )}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 10v1" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className={cn('text-sm font-semibold truncate', isPaid ? 'text-zinc-400 line-through' : 'text-zinc-900')}>
              {event.title}
            </p>
            <p className="text-[11px] text-zinc-400">{event.platform}</p>
          </div>
        </div>
        <Badge variant={isPaid ? 'success' : isOverdue ? 'danger' : 'warning'}>
          {event.status}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <span className="text-zinc-400">Amount</span>
          <p className="font-semibold text-zinc-900">{event.amount ? formatCurrency(event.amount) : '-'}</p>
        </div>
        <div>
          <span className="text-zinc-400">Due Date</span>
          <p className="font-semibold text-zinc-900">{formatDate(event.date)}</p>
        </div>
        {event.paidDate && (
          <div>
            <span className="text-zinc-400">Paid On</span>
            <p className="font-semibold text-zinc-900">{formatDate(event.paidDate)}</p>
          </div>
        )}
        {event.description && (
          <div>
            <span className="text-zinc-400">Details</span>
            <p className="font-medium text-zinc-700">{event.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ReminderEventDetail({ event }: { event: CalendarEvent }) {
  const isCompleted = event.status === 'Completed';
  const isMissed = event.status === 'Missed';

  return (
    <div className={cn(
      'rounded-xl p-3 border',
      isCompleted ? 'bg-zinc-50 border-zinc-100 opacity-60' :
      isMissed ? 'bg-red-50 border-red-200' :
      'bg-white border-zinc-200'
    )}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
            isCompleted ? 'bg-zinc-300 text-white' :
            isMissed ? 'bg-red-500 text-white' :
            'bg-zinc-900 text-white'
          )}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className={cn('text-sm font-semibold truncate', isCompleted ? 'text-zinc-400 line-through' : 'text-zinc-900')}>
              {event.title}
            </p>
          </div>
        </div>
        <Badge variant={isCompleted ? 'success' : isMissed ? 'danger' : 'default'}>
          {event.status}
        </Badge>
      </div>
      <div className="flex items-center gap-3 text-[11px] pl-9">
        <span className="text-zinc-400">{formatDateTime(event.date)}</span>
        {event.category && (
          <span className="bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded font-medium">{event.category}</span>
        )}
        {event.priority && (
          <span className={cn(
            'font-semibold uppercase',
            event.priority === 'High' ? 'text-red-500' :
            event.priority === 'Medium' ? 'text-zinc-500' : 'text-zinc-400'
          )}>{event.priority}</span>
        )}
      </div>
      {event.description && (
        <p className="text-xs text-zinc-500 mt-1.5 pl-9">{event.description}</p>
      )}
    </div>
  );
}
