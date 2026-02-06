'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ProgressBar from '@/components/ui/ProgressBar';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useLoans } from '@/hooks/useLoans';
import { Loan } from '@/types';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function LoansPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { loans, loading, fetchLoans, deleteLoan } = useLoans();
  const [filter, setFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) fetchLoans(filter === 'all' ? undefined : filter);
  }, [user, filter, fetchLoans]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const result = await deleteLoan(deleteId);
    if (result.success) {
      toast.success('Loan deleted');
      fetchLoans(filter === 'all' ? undefined : filter);
    }
    setDeleteId(null);
  };

  if (authLoading || !user) return null;

  const totalBorrowed = loans.reduce((s, l) => s + l.totalAmount, 0);
  const totalPayable = loans.reduce((s, l) => s + (l.totalPayable || l.emiAmount * l.tenure), 0);
  const totalPaid = loans.reduce((s, l) => s + (l.amountPaid || 0), 0);
  const totalPending = totalPayable - totalPaid;

  return (
    <AppLayout>
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Loans</h1>
          <Link href="/loans/new">
            <Button size="sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Loan
            </Button>
          </Link>
        </div>

        {/* Summary */}
        {loans.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">Borrowed</p>
              <p className="text-sm font-bold text-zinc-900 mt-1">{formatCurrency(totalBorrowed)}</p>
            </Card>
            <Card>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">Total Payable</p>
              <p className="text-sm font-bold text-zinc-900 mt-1">{formatCurrency(totalPayable)}</p>
            </Card>
            <Card>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">Paid</p>
              <p className="text-sm font-bold text-zinc-900 mt-1">{formatCurrency(totalPaid)}</p>
            </Card>
            <Card>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">Pending</p>
              <p className="text-sm font-bold text-zinc-900 mt-1">{formatCurrency(totalPending)}</p>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['all', 'Active', 'Completed', 'Overdue'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                filter === f ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
              )}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-36 rounded-2xl skeleton" />)}
          </div>
        ) : loans.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="No loans found"
            description="Start tracking your loans and EMI payments"
            action={<Link href="/loans/new"><Button size="sm">Add Loan</Button></Link>}
          />
        ) : (
          <div className="space-y-3">
            {loans.map((loan) => (
              <LoanCard key={loan.id} loan={loan} onClick={() => router.push(`/loans/${loan.id}`)} onDelete={(id) => setDeleteId(id)} />
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Loan">
        <p className="text-zinc-500 text-sm mb-4">This will permanently delete this loan and all its EMI records.</p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </AppLayout>
  );
}

function LoanCard({ loan, onClick, onDelete }: { loan: Loan; onClick: () => void; onDelete: (id: string) => void }) {
  const totalPayable = loan.totalPayable || loan.emiAmount * loan.tenure;
  return (
    <Card hoverable onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-semibold text-zinc-900 text-sm truncate">{loan.title}</h3>
            <Badge variant={loan.status === 'Completed' ? 'success' : loan.status === 'Overdue' ? 'danger' : 'default'}>
              {loan.status}
            </Badge>
          </div>
          <p className="text-xs text-zinc-400">{loan.platform}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(loan.id); }}
          className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-300 hover:text-red-500 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <div className="bg-zinc-50 rounded-lg py-2 px-3">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Borrowed</p>
          <p className="text-sm font-semibold text-zinc-900">{formatCurrency(loan.totalAmount)}</p>
        </div>
        <div className="bg-zinc-50 rounded-lg py-2 px-3">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Payable</p>
          <p className="text-sm font-semibold text-zinc-900">{formatCurrency(totalPayable)}</p>
        </div>
        <div className="bg-zinc-50 rounded-lg py-2 px-3">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Paid</p>
          <p className="text-sm font-semibold text-zinc-900">{formatCurrency(loan.amountPaid || 0)}</p>
        </div>
        <div className="bg-zinc-50 rounded-lg py-2 px-3">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Pending</p>
          <p className="text-sm font-semibold text-zinc-900">{formatCurrency(loan.amountPending || 0)}</p>
        </div>
      </div>

      <ProgressBar percent={loan.progressPercent || 0} size="sm" />

      <div className="flex items-center justify-between mt-3 text-[11px] text-zinc-400">
        <span>EMI {formatCurrency(loan.emiAmount)} / month</span>
        <span>Next: {loan.nextEmiDate ? formatDate(loan.nextEmiDate) : 'None'}</span>
      </div>
    </Card>
  );
}
