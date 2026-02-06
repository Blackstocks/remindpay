'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { useReminders } from '@/hooks/useReminders';
import toast from 'react-hot-toast';

export default function EditReminderPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const { updateReminder } = useReminders();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [form, setForm] = useState({
    title: '',
    description: '',
    dateTime: '',
    category: 'Personal',
    priority: 'Medium',
    status: 'Pending',
  });

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && params.id) {
      fetch(`/api/reminders/${params.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            const r = data.data;
            setForm({
              title: r.title,
              description: r.description || '',
              dateTime: new Date(r.dateTime).toISOString().slice(0, 16),
              category: r.category,
              priority: r.priority,
              status: r.status,
            });
          }
        })
        .finally(() => setFetching(false));
    }
  }, [user, params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await updateReminder(params.id as string, form as any);
    if (result.success) {
      toast.success('Reminder updated!');
      router.push('/reminders');
    } else {
      toast.error(result.error || 'Failed to update');
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
          <h1 className="text-2xl font-bold text-zinc-900">Edit Reminder</h1>
        </div>

        {fetching ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl skeleton" />
            ))}
          </div>
        ) : (
          <Card>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="title"
                label="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-none"
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Select
                  id="category"
                  label="Category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
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
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  options={[
                    { value: 'Low', label: 'Low' },
                    { value: 'Medium', label: 'Medium' },
                    { value: 'High', label: 'High' },
                  ]}
                />
                <Select
                  id="status"
                  label="Status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  options={[
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Completed', label: 'Completed' },
                    { value: 'Missed', label: 'Missed' },
                  ]}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => router.back()} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" loading={loading} className="flex-1">
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
