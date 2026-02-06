'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import Card from '@/components/ui/Card';
import NotificationSetup from '@/components/ui/NotificationSetup';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-zinc-900">Settings</h1>

        <Card>
          <h2 className="font-semibold text-zinc-900 mb-1">Profile</h2>
          <p className="text-sm text-zinc-500 mb-3">Your account information</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Name</span>
              <span className="font-medium text-zinc-900">{user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Email</span>
              <span className="font-medium text-zinc-900">{user.email}</span>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-zinc-900 mb-1">Notifications</h2>
          <p className="text-sm text-zinc-500 mb-3">
            Enable push notifications to receive reminders and EMI alerts
          </p>
          <NotificationSetup />
        </Card>

        <Card>
          <h2 className="font-semibold text-zinc-900 mb-1">Install App</h2>
          <p className="text-sm text-zinc-500 mb-3">
            Install RemindPay as an app on your device for quick access
          </p>
          <div className="space-y-2 text-sm text-zinc-600">
            <p><strong>iPhone/iPad:</strong> Tap the Share button, then &quot;Add to Home Screen&quot;</p>
            <p><strong>Android:</strong> Tap the menu (three dots), then &quot;Install app&quot; or &quot;Add to Home Screen&quot;</p>
            <p><strong>Desktop:</strong> Click the install icon in the address bar</p>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
