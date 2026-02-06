// ─── Reminder Types ──────────────────────────────────────────
export type ReminderCategory = 'Work' | 'Meeting' | 'Personal' | 'Loan' | 'Other';
export type ReminderPriority = 'Low' | 'Medium' | 'High';
export type ReminderStatus = 'Pending' | 'Completed' | 'Missed';

export interface Reminder {
  id: string;
  title: string;
  description?: string | null;
  dateTime: string;
  category: ReminderCategory;
  priority: ReminderPriority;
  status: ReminderStatus;
  loanId?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderFormData {
  title: string;
  description?: string;
  dateTime: string;
  category: ReminderCategory;
  priority: ReminderPriority;
}

// ─── Loan Types ──────────────────────────────────────────────
export type LoanStatus = 'Active' | 'Completed' | 'Overdue';
export type EMIStatus = 'Pending' | 'Paid' | 'Overdue';

export interface Loan {
  id: string;
  platform: string;
  title: string;
  totalAmount: number;
  emiAmount: number;
  emiDate: number;
  startDate: string;
  tenure: number;
  status: LoanStatus;
  notes?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  emiPayments?: EMIPayment[];
  // Computed fields
  totalPayable?: number;
  amountPaid?: number;
  amountPending?: number;
  progressPercent?: number;
  nextEmiDate?: string;
}

export interface LoanFormData {
  platform: string;
  title: string;
  totalAmount: number;
  emiAmount: number;
  emiDate: number;
  startDate: string;
  tenure: number;
  notes?: string;
}

export interface EMIPayment {
  id: string;
  amount: number;
  dueDate: string;
  paidDate?: string | null;
  status: EMIStatus;
  month: number;
  loanId: string;
  createdAt: string;
}

// ─── User Types ──────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
}

// ─── Dashboard Types ─────────────────────────────────────────
export interface DashboardData {
  todayReminders: Reminder[];
  upcomingReminders: Reminder[];
  overdueReminders: Reminder[];
  activeLoans: Loan[];
  stats: {
    totalReminders: number;
    pendingReminders: number;
    completedReminders: number;
    missedReminders: number;
    totalLoans: number;
    activeLoans: number;
    totalLoanAmount: number;
    totalPaid: number;
    totalPending: number;
  };
}

// ─── API Response Types ──────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
