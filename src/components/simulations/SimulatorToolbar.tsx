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
    <div
      className={cn(
        'w-full rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm',
        className
      )}
    >
      {(label || status) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {label && (
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {label}
            </span>
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {stepCounter && (
              <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-foreground/80">
                Step {stepCounter.current} / {stepCounter.total}
              </span>
            )}
            {status}
          </div>
        </div>
      )}

      <div
        className={cn(
          'flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between',
          (label || status) && 'mt-3'
        )}
      >
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </div>

      {hint && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
};
