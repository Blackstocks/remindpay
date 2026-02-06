'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { useReminders } from '@/hooks/useReminders';
import { ReminderFormData } from '@/types';
import toast from 'react-hot-toast';

export default function NewReminderPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { createReminder } = useReminders();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ReminderFormData>({
    title: '',
    description: '',
    dateTime: '',
    category: 'Personal',
    priority: 'Medium',
  });

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await createReminder(form);
    if (result.success) {
      toast.success('Reminder created!');
      router.push('/reminders');
    } else {
      toast.error(result.error || 'Failed to create reminder');
    }
    setLoading(false);
  };

  if (authLoading || !user) return null;

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="mb-6">
          <button onClick={() => router.back()} className="text-zinc-500 hover:text-zinc-700 mb-2 flex items-center gap-1 text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-bold text-zinc-900">New Reminder</h1>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="title"
              label="Title"
              placeholder="e.g., Doctor appointment"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Description</label>
              <textarea
                placeholder="Add details (optional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 text-base sm:text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-none"
              />
            </div>
            <Input
              id="dateTime"
              type="datetime-local"
              label="Date & Time"
              value={form.dateTime}
              onChange={(e) => setForm({ ...form, dateTime: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                id="category"
                label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                options={[
                  { value: 'Personal', label: 'Personal' },
                  { value: 'Work', label: 'Work' },
                  { value: 'Meeting', label: 'Meeting' },
                  { value: 'Loan', label: 'Loan' },
                  { value: 'Other', label: 'Other' },
                ]}
              />
              <Select
                id="priority"
                label="Priority"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                options={[
                  { value: 'Low', label: 'Low' },
                  { value: 'Medium', label: 'Medium' },
                  { value: 'High', label: 'High' },
                ]}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => router.back()} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" loading={loading} className="flex-1">
                Create Reminder
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}
