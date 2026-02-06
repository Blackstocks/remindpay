'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { useLoans } from '@/hooks/useLoans';
import { LoanFormData } from '@/types';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function NewLoanPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { createLoan } = useLoans();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<LoanFormData>({
    platform: '',
    title: '',
    totalAmount: 0,
    emiAmount: 0,
    emiDate: 0,
    startDate: new Date().toISOString().split('T')[0],
    tenure: 0,
    notes: '',
  });

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.emiDate || form.emiDate < 1 || form.emiDate > 31) {
      toast.error('EMI day must be between 1 and 31');
      return;
    }
    if (!form.tenure || form.tenure < 1) {
      toast.error('Tenure must be at least 1 month');
      return;
    }
    if (form.emiAmount * form.tenure < form.totalAmount * 0.5) {
      toast.error('EMI amount seems too low for the total amount and tenure');
      return;
    }

    setLoading(true);
    const result = await createLoan(form);
    if (result.success) {
      toast.success('Loan added with EMI schedule!');
      router.push('/loans');
    } else {
      toast.error(result.error || 'Failed to create loan');
    }
    setLoading(false);
  };

  if (authLoading || !user) return null;

  const estimatedTotal = form.emiAmount * form.tenure;

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
          <h1 className="text-2xl font-bold text-zinc-900">Add New Loan</h1>
          <p className="text-zinc-500 mt-1">Track your loan and EMI payments</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="platform"
              label="Platform / Lender"
              placeholder="e.g., HDFC Bank, PhonePe, Friend"
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
              required
            />
            <Input
              id="title"
              label="Loan Title"
              placeholder="e.g., Home Loan, Personal Loan"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="totalAmount"
                type="number"
                label="Total Loan Amount"
                placeholder="500000"
                value={form.totalAmount || ''}
                onChange={(e) => setForm({ ...form, totalAmount: parseFloat(e.target.value) || 0 })}
                required
                min={1}
              />
              <Input
                id="emiAmount"
                type="number"
                label="Monthly EMI"
                placeholder="15000"
                value={form.emiAmount || ''}
                onChange={(e) => setForm({ ...form, emiAmount: parseFloat(e.target.value) || 0 })}
                required
                min={1}
              />
            </div>
            <Input
              id="startDate"
              type="date"
              label="Start Date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="emiDate"
                type="number"
                label="EMI Day (1-31)"
                placeholder="5"
                value={form.emiDate || ''}
                onChange={(e) => setForm({ ...form, emiDate: parseInt(e.target.value) || 0 })}
                required
                min={1}
                max={31}
              />
              <Input
                id="tenure"
                type="number"
                label="Tenure (months)"
                placeholder="12"
                value={form.tenure || ''}
                onChange={(e) => setForm({ ...form, tenure: parseInt(e.target.value) || 0 })}
                required
                min={1}
                max={360}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Notes (optional)</label>
              <textarea
                placeholder="Add any notes about this loan"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 text-base sm:text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-none"
              />
            </div>

            {/* Preview */}
            {form.totalAmount > 0 && form.emiAmount > 0 && (
              <div className="bg-zinc-50 rounded-xl p-4 space-y-2">
                <h4 className="text-sm font-medium text-zinc-700">Summary Preview</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-zinc-500">Total Loan:</span>
                    <span className="ml-2 font-medium">{formatCurrency(form.totalAmount)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Monthly EMI:</span>
                    <span className="ml-2 font-medium">{formatCurrency(form.emiAmount)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Total Payable:</span>
                    <span className="ml-2 font-medium">{formatCurrency(estimatedTotal)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Interest:</span>
                    <span className="ml-2 font-medium text-zinc-700">
                      {formatCurrency(Math.max(estimatedTotal - form.totalAmount, 0))}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => router.back()} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" loading={loading} className="flex-1">
                Add Loan
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}
