import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SimulatorToolbarProps {
  label?: string;
  status?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  stepCounter?: { current: number; total: number };
}

export const SimulatorToolbar = ({
  label,
  status,
  hint,
  children,
  className,
  stepCounter,
}: SimulatorToolbarProps) => {
  return (
    <div className={cn('w-full border-t border-white/10 bg-gray-800/40 px-4 py-3', className)}>
      {(label || status) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {label && (
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
              {label}
            </span>
          )}
          {status && <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">{status}</div>}
        </div>
      )}

      <div className={cn('flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between', (label || status) && 'mt-3')}>
        <div className="flex flex-wrap items-center gap-2">
          {children}
        </div>
        {stepCounter && (
          <span className="whitespace-nowrap text-sm text-slate-400">
            Step {stepCounter.current} / {stepCounter.total}
          </span>
        )}
      </div>

      {hint && (
        <p className="mt-3 text-sm leading-relaxed text-gray-400">
          {hint}
        </p>
      )}
    </div>
  );
};
