'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useReminders } from '@/hooks/useReminders';
import { Reminder } from '@/types';
import { formatDateTime, getRelativeTime, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function RemindersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { reminders, loading, fetchReminders, markCompleted, deleteReminder } = useReminders();
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      const params: Record<string, string> = {};
      if (filter !== 'all') params.status = filter;
      if (search) params.search = search;
      fetchReminders(params);
    }
  }, [user, filter, search, fetchReminders]);

  const handleComplete = async (id: string) => {
    const result = await markCompleted(id);
    if (result.success) toast.success('Marked as completed');
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const result = await deleteReminder(deleteId);
    if (result.success) toast.success('Reminder deleted');
    setDeleteId(null);
  };

  if (authLoading || !user) return null;

  return (
    <AppLayout>
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Reminders</h1>
          <Link href="/reminders/new">
            <Button size="sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search reminders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-base sm:text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {['all', 'Pending', 'Completed', 'Missed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                filter === f
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
              )}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-20 rounded-2xl skeleton" />)}
          </div>
        ) : reminders.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            }
            title="No reminders found"
            description={search ? 'Try a different search term' : 'Create your first reminder to get started'}
            action={!search ? <Link href="/reminders/new"><Button size="sm">Create Reminder</Button></Link> : undefined}
          />
        ) : (
          <div className="space-y-2">
            {reminders.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                onComplete={handleComplete}
                onDelete={(id) => setDeleteId(id)}
                onEdit={(id) => router.push(`/reminders/${id}/edit`)}
              />
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Reminder">
        <p className="text-zinc-500 text-sm mb-4">Are you sure? This action cannot be undone.</p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </AppLayout>
  );
}

function ReminderCard({ reminder, onComplete, onDelete, onEdit }: {
  reminder: Reminder;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const isPast = new Date(reminder.dateTime) < new Date();

  return (
    <Card className="group">
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        {reminder.status === 'Pending' ? (
          <button
            onClick={() => onComplete(reminder.id)}
            className="mt-0.5 w-5 h-5 rounded-full border-2 border-zinc-300 hover:border-zinc-900 hover:bg-zinc-100 transition-colors flex-shrink-0"
          />
        ) : (
          <div className={cn(
            'mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
            reminder.status === 'Completed' ? 'bg-zinc-900' : 'bg-red-500'
          )}>
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {reminder.status === 'Completed'
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              }
            </svg>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className={cn(
              'font-medium text-sm truncate',
              reminder.status === 'Completed' ? 'text-zinc-400 line-through' : 'text-zinc-900'
            )}>
              {reminder.title}
            </h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-medium flex-shrink-0">
              {reminder.category}
            </span>
          </div>
          {reminder.description && (
            <p className="text-xs text-zinc-400 mb-0.5 line-clamp-1">{reminder.description}</p>
          )}
          <div className="flex items-center gap-3 text-[11px] text-zinc-400">
            <span className={isPast && reminder.status === 'Pending' ? 'text-red-400' : ''}>
              {formatDateTime(reminder.dateTime)}
            </span>
            <span>{getRelativeTime(reminder.dateTime)}</span>
            <span className="uppercase tracking-wide font-medium">{reminder.priority}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(reminder.id)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={() => onDelete(reminder.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </Card>
  );
}
