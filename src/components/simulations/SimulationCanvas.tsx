import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SimulationCanvasProps {
  children: ReactNode;
  isLive?: boolean;
  label?: string;
  className?: string;
}

export const SimulationCanvas = ({
  children,
  isLive = true,
  label = 'Simulation Running',
  className,
}: SimulationCanvasProps) => {
  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-200 dark:border-zinc-700/50 border-t-[3px] border-t-cyan-500 bg-zinc-50 dark:bg-zinc-900/95 shadow-lg shadow-cyan-500/5 ring-1 ring-cyan-500/10 p-6 mt-8 mb-4 relative overflow-hidden',
        className
      )}
    >
      <div className="absolute left-5 top-4 flex items-center gap-2 text-xs tracking-wide text-cyan-400 font-semibold">
        <span className={cn('inline-block h-2.5 w-2.5 rounded-full bg-cyan-400', isLive && 'animate-pulse')} />
        {label}
      </div>

      <div className="relative pt-7">{children}</div>
    </div>
  );
};


