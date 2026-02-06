'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ProgressBar from '@/components/ui/ProgressBar';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { useLoans } from '@/hooks/useLoans';
import { Loan, EMIPayment } from '@/types';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function LoanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const { markEmiPaid, deleteLoan } = useLoans();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [payingEmi, setPayingEmi] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const fetchLoan = async () => {
    try {
      const res = await fetch(`/api/loans/${params.id}`);
      const data = await res.json();
      if (data.success) setLoan(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && params.id) fetchLoan();
  }, [user, params.id]);

  const handlePayEmi = async (emiId: string) => {
    setPayingEmi(emiId);
    const result = await markEmiPaid(params.id as string, emiId);
    if (result.success) {
      toast.success('EMI marked as paid');
      setLoan(result.data);
    } else {
      toast.error(result.error || 'Failed');
    }
    setPayingEmi(null);
  };

  const handleDelete = async () => {
    const result = await deleteLoan(params.id as string);
    if (result.success) {
      toast.success('Loan deleted');
      router.push('/loans');
    }
  };

  if (authLoading || !user) return null;

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4 max-w-2xl mx-auto">
          <div className="h-8 w-48 skeleton rounded-lg" />
          <div className="h-40 skeleton rounded-2xl" />
          <div className="h-60 skeleton rounded-2xl" />
        </div>
      </AppLayout>
    );
  }

  if (!loan) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-zinc-400">Loan not found</p>
          <Button variant="outline" onClick={() => router.push('/loans')} className="mt-4">Go Back</Button>
        </div>
      </AppLayout>
    );
  }

  const totalPayable = loan.totalPayable || loan.emiAmount * loan.tenure;
  const paidEmis = loan.emiPayments?.filter((e) => e.status === 'Paid').length || 0;
  const totalEmis = loan.emiPayments?.length || 0;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
        {/* Back + Actions */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="text-zinc-400 hover:text-zinc-700 flex items-center gap-1 text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>Delete</Button>
        </div>

        {/* Loan Header */}
        <Card>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-zinc-900 tracking-tight">{loan.title}</h1>
              <p className="text-zinc-400 text-sm">{loan.platform}</p>
            </div>
            <Badge variant={loan.status === 'Completed' ? 'success' : loan.status === 'Overdue' ? 'danger' : 'default'}>
              {loan.status}
            </Badge>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
            <div className="bg-zinc-50 rounded-xl py-2.5 sm:py-3 px-2 text-center">
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-zinc-400 font-medium">Payable</p>
              <p className="text-sm sm:text-base font-bold text-zinc-900 mt-0.5">{formatCurrency(totalPayable)}</p>
            </div>
            <div className="bg-zinc-50 rounded-xl py-2.5 sm:py-3 px-2 text-center">
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-zinc-400 font-medium">Paid</p>
              <p className="text-sm sm:text-base font-bold text-zinc-900 mt-0.5">{formatCurrency(loan.amountPaid || 0)}</p>
            </div>
            <div className="bg-zinc-50 rounded-xl py-2.5 sm:py-3 px-2 text-center">
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-zinc-400 font-medium">Pending</p>
              <p className="text-sm sm:text-base font-bold text-zinc-900 mt-0.5">{formatCurrency(loan.amountPending || 0)}</p>
            </div>
          </div>

          <ProgressBar percent={loan.progressPercent || 0} />

          <div className="flex items-center justify-between mt-3 text-xs text-zinc-400">
            <span>{paidEmis} of {totalEmis} EMIs paid</span>
            <span>EMI {formatCurrency(loan.emiAmount)} on {loan.emiDate}th</span>
          </div>

          {loan.notes && (
            <div className="mt-3 pt-3 border-t border-zinc-100">
              <p className="text-sm text-zinc-500">{loan.notes}</p>
            </div>
          )}

          {/* Principal vs Interest breakdown */}
          <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
            <span>Principal: {formatCurrency(loan.totalAmount)}</span>
            <span>Interest: {formatCurrency(Math.max(totalPayable - loan.totalAmount, 0))}</span>
          </div>
        </Card>

        {/* EMI Schedule */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">EMI Schedule</h2>
          <div className="space-y-2">
            {loan.emiPayments?.map((emi) => (
              <EMICard key={emi.id} emi={emi} onPay={handlePayEmi} paying={payingEmi === emi.id} />
            ))}
          </div>
        </div>
      </div>

      <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Delete Loan">
        <p className="text-zinc-500 text-sm mb-4">
          This will permanently delete <strong className="text-zinc-900">{loan.title}</strong> and all EMI records.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setShowDelete(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </AppLayout>
  );
}

function EMICard({ emi, onPay, paying }: { emi: EMIPayment; onPay: (id: string) => void; paying: boolean }) {
  const isPaid = emi.status === 'Paid';
  const isOverdue = emi.status === 'Overdue';

  return (
    <Card className={cn(isPaid && 'opacity-60')}>
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
          isPaid ? 'bg-zinc-900 text-white' :
          isOverdue ? 'bg-red-50 text-red-600' :
          'bg-zinc-100 text-zinc-600'
        )}>
          {emi.month}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-zinc-900 text-sm">{formatCurrency(emi.amount)}</p>
            <Badge variant={isPaid ? 'success' : isOverdue ? 'danger' : 'default'}>
              {emi.status}
            </Badge>
          </div>
          <p className="text-[11px] text-zinc-400 truncate">
            Due: {formatDate(emi.dueDate)}
            {emi.paidDate && ` · Paid: ${formatDate(emi.paidDate)}`}
          </p>
        </div>

        <div className="flex-shrink-0">
          {!isPaid && (
            <Button
              size="sm"
              variant={isOverdue ? 'danger' : 'primary'}
              loading={paying}
              onClick={() => onPay(emi.id)}
            >
              Pay
            </Button>
          )}

          {isPaid && (
            <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
    </Card>
  );
}
