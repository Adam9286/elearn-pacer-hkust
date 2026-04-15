import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  getSimulatorStatusLabel,
  type SimulatorGuideMode,
} from './simulatorStepConfig';

interface SimulationCanvasProps {
  children: ReactNode;
  coachPanel?: ReactNode;
  isLive?: boolean;
  label?: string;
  statusMode?: SimulatorGuideMode;
  isComplete?: boolean;
  className?: string;
}

export const SimulationCanvas = ({
  children,
  coachPanel,
  isLive = true,
  label,
  statusMode = 'exploratory',
  isComplete = false,
  className,
}: SimulationCanvasProps) => {
  const resolvedLabel = getSimulatorStatusLabel(statusMode, isComplete, label);
  const shouldPulse = statusMode === 'exploratory' ? isLive : isLive && !isComplete;

  return (
    <div
      className={cn(
        'relative mt-5 mb-4 overflow-hidden rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.02))] px-4 py-4 shadow-[0_18px_48px_rgba(2,8,23,0.18)] backdrop-blur-sm md:px-5 md:py-5',
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          <span className={cn('inline-block h-2 w-2 rounded-full bg-primary', shouldPulse && 'animate-pulse')} />
          {resolvedLabel}
        </div>
        <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Simulation First
        </span>
      </div>

      <div className={cn('grid gap-4', coachPanel ? 'xl:grid-cols-[minmax(0,1.55fr)_332px]' : '')}>
        <div className="relative rounded-[22px] border border-white/8 bg-black/10 p-3 md:p-4">
          {children}
        </div>
        {coachPanel ? (
          <div className="xl:sticky xl:top-5 xl:self-start">
            {coachPanel}
          </div>
        ) : null}
      </div>
    </div>
  );
};
