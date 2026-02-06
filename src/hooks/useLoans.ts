'use client';

import { useState, useCallback } from 'react';
import { Loan, LoanFormData } from '@/types';

export function useLoans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLoans = useCallback(async (status?: string) => {
    setLoading(true);
    try {
      const query = status ? `?status=${status}` : '';
      const res = await fetch(`/api/loans${query}`);
      const data = await res.json();
      if (data.success) setLoans(data.data);
    } catch (error) {
      console.error('Fetch loans error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLoan = async (id: string): Promise<Loan | null> => {
    try {
      const res = await fetch(`/api/loans/${id}`);
      const data = await res.json();
      return data.success ? data.data : null;
    } catch {
      return null;
    }
  };

  const createLoan = async (formData: LoanFormData) => {
    const res = await fetch('/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    return res.json();
  };

  const updateLoan = async (id: string, updates: Partial<Loan>) => {
    const res = await fetch(`/api/loans/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  };

  const deleteLoan = async (id: string) => {
    const res = await fetch(`/api/loans/${id}`, { method: 'DELETE' });
    return res.json();
  };

  const markEmiPaid = async (loanId: string, emiId: string) => {
    const res = await fetch(`/api/loans/${loanId}/emi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emiId }),
    });
    const data = await res.json();
    if (data.success) {
      setLoans((prev) =>
        prev.map((l) => (l.id === loanId ? data.data : l))
      );
    }
    return data;
  };

  return {
    loans,
    loading,
    fetchLoans,
    fetchLoan,
    createLoan,
    updateLoan,
    deleteLoan,
    markEmiPaid,
  };
}
