'use client';

import { useEffect, useState, useCallback } from 'react';
import Button from '@/components/ui/Button';
import type { GoogleAccount } from '@/types';

export default function GoogleAccountsSection() {
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/google/accounts');
      const data = await res.json();
      if (data.success) setAccounts(data.data);
    } catch {
      console.error('Failed to fetch Google accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Handle OAuth callback params in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleStatus = params.get('google');
    if (googleStatus === 'success') {
      const email = params.get('email');
      setMessage({ type: 'success', text: `Connected ${email || 'Google account'} successfully!` });
      fetchAccounts();
      // Clean URL
      window.history.replaceState({}, '', '/settings');
    } else if (googleStatus === 'error') {
      const reason = params.get('reason') || 'Unknown error';
      setMessage({ type: 'error', text: `Failed to connect: ${reason}` });
      window.history.replaceState({}, '', '/settings');
    }
  }, [fetchAccounts]);

  // Auto-dismiss message
  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(t);
    }
  }, [message]);

  const handleConnect = () => {
    window.location.href = '/api/auth/google';
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/auth/google/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        fetchAccounts();
      } else {
        setMessage({ type: 'error', text: data.error || 'Sync failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Sync failed' });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async (id: string, email: string) => {
    if (!confirm(`Disconnect ${email}? This will remove all synced events from this account.`)) return;

    try {
      const res = await fetch(`/api/auth/google/accounts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setAccounts((prev) => prev.filter((a) => a.id !== id));
        setMessage({ type: 'success', text: `Disconnected ${email}` });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to disconnect' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to disconnect' });
    }
  };

  return (
    <div>
      {/* Toast message */}
      {message && (
        <div className={`mb-3 rounded-lg px-3 py-2 text-sm font-medium ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Connected accounts list */}
          {accounts.length > 0 && (
            <div className="space-y-2 mb-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between bg-zinc-50 rounded-lg px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{account.email}</p>
                    <p className="text-[11px] text-zinc-400">
                      {account.lastSyncAt
                        ? `Last synced: ${new Date(account.lastSyncAt).toLocaleString()}`
                        : 'Not synced yet'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDisconnect(account.id, account.email)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium ml-2 flex-shrink-0"
                  >
                    Disconnect
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button onClick={handleConnect} variant="primary" size="sm">
              {accounts.length > 0 ? 'Add Another Account' : 'Connect Google Account'}
            </Button>
            {accounts.length > 0 && (
              <Button onClick={handleSync} variant="secondary" size="sm" disabled={syncing}>
                {syncing ? 'Syncing...' : 'Sync Now'}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
