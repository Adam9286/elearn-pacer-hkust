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
        'mt-6 mb-4 relative overflow-hidden rounded-2xl bg-gray-950/25 px-6 py-5',
        className
      )}
    >
      <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
        <span className={cn('inline-block h-2 w-2 rounded-full bg-cyan-400', isLive && 'animate-pulse')} />
        {label}
      </div>

      <div className="relative">{children}</div>
    </div>
  );
};


