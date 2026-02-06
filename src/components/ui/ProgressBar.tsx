'use client';

import { cn } from '@/lib/utils';

interface ProgressBarProps {
  percent: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export default function ProgressBar({
  percent,
  size = 'md',
  showLabel = true,
  className,
}: ProgressBarProps) {
  const heights = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' };
  const clampedPercent = Math.min(Math.max(percent, 0), 100);

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between mb-1.5">
          <span className="text-[11px] text-zinc-400 uppercase tracking-wide font-medium">Progress</span>
          <span className="text-[11px] font-bold text-zinc-700">{clampedPercent}%</span>
        </div>
      )}
      <div className={cn('w-full bg-zinc-100 rounded-full overflow-hidden', heights[size])}>
        <div
          className={cn('rounded-full transition-all duration-500 ease-out', heights[size], 'bg-zinc-900')}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
    </div>
  );
}
