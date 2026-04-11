import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConceptGuide } from './ConceptGuide';
import {
  getSimulatorStatusLabel,
  type ConceptStep,
  type SimulatorGuideMode,
} from './simulatorStepConfig';

interface SimulationShellProps {
  title: string;
  category: string;
  summary: string;
  learningFocus: string;
  conceptSteps: ConceptStep[];
  guideMode: SimulatorGuideMode;
  guideStatusLabel?: string;
  isGuideComplete: boolean;
  currentStep: number;
  onExit: () => void;
  children: ReactNode;
}

export const SimulationShell = ({
  title,
  category,
  summary,
  learningFocus,
  conceptSteps,
  guideMode,
  guideStatusLabel,
  isGuideComplete,
  currentStep,
  onExit,
  children,
}: SimulationShellProps) => {
  const clampedStep = conceptSteps.length > 0
    ? Math.min(Math.max(currentStep, 0), conceptSteps.length - 1)
    : 0;
  const resolvedStatusLabel = getSimulatorStatusLabel(guideMode, isGuideComplete, guideStatusLabel);

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/55 backdrop-blur-sm">
      <div className="flex items-center gap-4 border-b border-border/70 bg-muted/35 px-4 py-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onExit}
          className="border-border text-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Exit
        </Button>
        <div>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <p className="text-xs font-medium text-primary/80">{category}</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="hidden xl:block">
          <ConceptGuide
            title={title}
            summary={summary}
            learningFocus={learningFocus}
            steps={conceptSteps}
            currentStep={clampedStep}
            mode={guideMode}
            isComplete={isGuideComplete}
            statusLabel={guideStatusLabel}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-4 px-6 pt-5">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Interactive Simulation Workspace
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
            {children}
          </div>
        </div>
      </div>

      <div className="border-t border-border/70 bg-muted/30 px-4 py-3 xl:hidden">
        <div className="flex flex-wrap gap-1.5">
          {conceptSteps.map((step, idx) => (
            <span
              key={step.title}
              className={`flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-medium transition-colors ${
                idx === clampedStep
                  ? 'bg-primary text-primary-foreground'
                  : idx < clampedStep
                    ? 'bg-primary/15 text-primary'
                    : 'border border-border bg-background/70 text-muted-foreground'
              }`}
            >
              {idx + 1}
            </span>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-border/60 bg-background/75 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Step {clampedStep + 1}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {conceptSteps[clampedStep]?.title ?? 'Start Here'}
              </p>
            </div>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              {resolvedStatusLabel}
            </span>
          </div>
          {conceptSteps[clampedStep]?.description && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {conceptSteps[clampedStep].description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
