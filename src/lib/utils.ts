// Simple className merge utility (no clsx dependency needed)
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

// Format currency in Indian Rupees
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date for display
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Format date with time
export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Get relative time string (e.g., "in 2 hours", "3 days ago")
export function getRelativeTime(date: Date | string): string {
  const now = new Date();
  const target = new Date(date);
  const diffMs = target.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (Math.abs(diffMins) < 1) return 'just now';
  if (Math.abs(diffMins) < 60) {
    return diffMins > 0 ? `in ${diffMins}m` : `${Math.abs(diffMins)}m ago`;
  }
  if (Math.abs(diffHours) < 24) {
    return diffHours > 0 ? `in ${diffHours}h` : `${Math.abs(diffHours)}h ago`;
  }
  if (Math.abs(diffDays) < 30) {
    return diffDays > 0 ? `in ${diffDays}d` : `${Math.abs(diffDays)}d ago`;
  }
  return formatDate(date);
}

// Priority color mapping
export function getPriorityColor(priority: string) {
  switch (priority) {
    case 'High':
      return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', dot: 'bg-red-500' };
    case 'Medium':
      return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', dot: 'bg-amber-500' };
    case 'Low':
      return { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', dot: 'bg-green-500' };
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-500' };
  }
}

// Status color mapping
export function getStatusColor(status: string) {
  switch (status) {
    case 'Completed':
    case 'Paid':
      return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
    case 'Pending':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case 'Missed':
    case 'Overdue':
      return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
    case 'Active':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
  }
}

// Category icon/color mapping
export function getCategoryStyle(category: string) {
  switch (category) {
    case 'Work':
      return { bg: 'bg-blue-100', text: 'text-blue-700' };
    case 'Meeting':
      return { bg: 'bg-purple-100', text: 'text-purple-700' };
    case 'Personal':
      return { bg: 'bg-green-100', text: 'text-green-700' };
    case 'Loan':
      return { bg: 'bg-orange-100', text: 'text-orange-700' };
    case 'Other':
      return { bg: 'bg-gray-100', text: 'text-gray-700' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700' };
  }
}

// Calculate loan stats — pending = total payable (emi*tenure) minus paid
export function calculateLoanStats(
  emiAmount: number,
  tenure: number,
  paidEmis: number
) {
  const totalPayable = emiAmount * tenure;
  const amountPaid = emiAmount * paidEmis;
  const amountPending = Math.max(totalPayable - amountPaid, 0);
  const progressPercent = Math.min(
    Math.round((amountPaid / totalPayable) * 100),
    100
  );
  return { totalPayable, amountPaid, amountPending, progressPercent };
}
