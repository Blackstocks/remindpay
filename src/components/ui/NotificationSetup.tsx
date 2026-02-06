'use client';

import { useState, useEffect } from 'react';
import Button from './Button';
import toast from 'react-hot-toast';

export default function NotificationSetup() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Notifications not supported in this browser');
      return;
    }

    const perm = await Notification.requestPermission();
    setPermission(perm);

    if (perm === 'granted') {
      await subscribeToPush();
    }
  };

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidKey) {
        toast.error('Push notifications not configured');
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // Send subscription to server
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });

      const data = await res.json();
      if (data.success) {
        setSubscribed(true);
        toast.success('Push notifications enabled!');
      }
    } catch (error) {
      console.error('Push subscription error:', error);
      toast.error('Failed to enable push notifications');
    }
  };

  if (permission === 'granted' || subscribed) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Notifications enabled
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <p className="text-sm text-gray-500">
        Notifications are blocked. Please enable them in your browser settings.
      </p>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={requestPermission}>
      Enable Notifications
    </Button>
  );
}

// Convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
