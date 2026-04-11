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
        'relative mt-6 mb-4 overflow-hidden rounded-2xl border border-border/70 bg-card/75 px-4 py-4 shadow-sm backdrop-blur-sm md:px-6 md:py-5',
        className
      )}
    >
      <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
        <span className={cn('inline-block h-2 w-2 rounded-full bg-primary', shouldPulse && 'animate-pulse')} />
        {resolvedLabel}
      </div>

      <div className="space-y-5">
        {coachPanel}
        <div className="relative">{children}</div>
      </div>
    </div>
  );
};
