import { useEffect, useRef } from 'react';
import {
  getSimulatorStatusLabel,
  type ConceptStep,
  type SimulatorGuideMode,
} from './simulatorStepConfig';

interface ConceptGuideProps {
  title: string;
  summary: string;
  learningFocus: string;
  steps: ConceptStep[];
  currentStep: number;
  mode: SimulatorGuideMode;
  isComplete: boolean;
  statusLabel?: string;
}

export const ConceptGuide = ({
  title,
  summary,
  learningFocus,
  steps,
  currentStep,
  mode,
  isComplete,
  statusLabel,
}: ConceptGuideProps) => {
  const activeRef = useRef<HTMLDivElement>(null);
  const clampedStep = steps.length > 0 ? Math.min(Math.max(currentStep, 0), steps.length - 1) : 0;
  const resolvedStatusLabel = getSimulatorStatusLabel(mode, isComplete, statusLabel);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [clampedStep]);

  return (
    <aside className="h-full w-[300px] flex-none overflow-y-auto border-r border-border/70 bg-card/70 p-5 xl:w-[340px]">
      <h3 className="mb-4 text-base font-semibold text-foreground">
        Concept Guide: {title}
      </h3>

      <div className="mb-5 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            {resolvedStatusLabel}
          </span>
          <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {mode}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
        <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2">
          <p className="text-sm text-foreground">
            <span className="font-semibold text-primary">Focus: </span>
            {learningFocus}
          </p>
        </div>
      </div>

      <div className="relative">
        {steps.map((step, idx) => {
          const isActive = idx === clampedStep;
          const isCompleted = idx < clampedStep;

          return (
            <div
              key={step.title}
              ref={isActive ? activeRef : undefined}
              className="group flex w-full items-start gap-3 py-2 text-left"
            >
              <div className="relative flex flex-col items-center">
                <div
                  className={
                    isActive
                      ? 'h-3 w-3 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.35)]'
                      : isCompleted
                        ? 'h-3 w-3 rounded-full bg-primary/55'
                        : 'h-3 w-3 rounded-full border-2 border-border'
                  }
                />
                {idx < steps.length - 1 && (
                  <div
                    className={`min-h-[24px] w-0.5 flex-1 ${
                      isActive
                        ? 'bg-primary/35'
                        : isCompleted
                          ? 'bg-primary/20'
                          : 'bg-border'
                    }`}
                  />
                )}
              </div>

              <div className="min-w-0 pb-2">
                <span
                  className={
                    isActive
                      ? 'text-sm font-semibold text-foreground'
                      : isCompleted
                        ? 'text-sm font-medium text-muted-foreground'
                        : 'text-sm text-muted-foreground/70'
                  }
                >
                  {idx + 1}. {step.title}
                </span>
                {isActive && (
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
