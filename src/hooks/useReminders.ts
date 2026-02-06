'use client';

import { useState, useCallback } from 'react';
import { Reminder, ReminderFormData } from '@/types';

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReminders = useCallback(async (params?: Record<string, string>) => {
    setLoading(true);
    try {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      const res = await fetch(`/api/reminders${query}`);
      const data = await res.json();
      if (data.success) setReminders(data.data);
    } catch (error) {
      console.error('Fetch reminders error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createReminder = async (formData: ReminderFormData) => {
    const res = await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    if (data.success) {
      setReminders((prev) => [...prev, data.data].sort(
        (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
      ));
    }
    return data;
  };

  const updateReminder = async (id: string, updates: Partial<Reminder>) => {
    const res = await fetch(`/api/reminders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (data.success) {
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? data.data : r))
      );
    }
    return data;
  };

  const deleteReminder = async (id: string) => {
    const res = await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      setReminders((prev) => prev.filter((r) => r.id !== id));
    }
    return data;
  };

  const markCompleted = async (id: string) => {
    return updateReminder(id, { status: 'Completed' } as Partial<Reminder>);
  };

  return {
    reminders,
    loading,
    fetchReminders,
    createReminder,
    updateReminder,
    deleteReminder,
    markCompleted,
  };
}
