import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConceptGuide } from './ConceptGuide';
import type { ConceptStep } from './simulatorStepConfig';

interface SimulationShellProps {
  title: string;
  category: string;
  summary: string;
  learningFocus: string;
  conceptSteps: ConceptStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onExit: () => void;
  children: ReactNode;
}

export const SimulationShell = ({
  title,
  category,
  summary,
  learningFocus,
  conceptSteps,
  currentStep,
  onStepChange,
  onExit,
  children,
}: SimulationShellProps) => {
  const clampedStep = conceptSteps.length > 0
    ? Math.min(Math.max(currentStep, 0), conceptSteps.length - 1)
    : 0;

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
      <div className="flex items-center gap-4 border-b border-white/10 bg-slate-900/60 px-4 py-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onExit}
          className="border-slate-600 text-slate-300 hover:text-white"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Exit
        </Button>
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="text-xs font-medium text-cyan-400/80">{category}</p>
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
            onStepChange={onStepChange}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-4 px-6 pt-5">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Interactive Simulation Workspace
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
            {children}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-white/10 bg-slate-900/40 px-4 py-2 xl:hidden">
        {conceptSteps.map((step, idx) => (
          <button
            key={step.title}
            type="button"
            onClick={() => onStepChange(idx)}
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors ${
              idx === clampedStep
                ? 'bg-cyan-400 text-slate-900'
                : idx < clampedStep
                  ? 'bg-slate-500 text-white'
                  : 'border-2 border-slate-600 text-slate-500'
            }`}
          >
            {idx + 1}
          </button>
        ))}
        <span className="ml-2 truncate text-xs text-slate-400">
          {conceptSteps[clampedStep]?.title ?? ''}
        </span>
      </div>
    </div>
  );
};
