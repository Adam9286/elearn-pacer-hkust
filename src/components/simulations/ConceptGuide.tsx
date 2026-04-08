import { useEffect, useRef } from 'react';
import type { ConceptStep } from './simulatorStepConfig';

interface ConceptGuideProps {
  title: string;
  summary: string;
  learningFocus: string;
  steps: ConceptStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
}

export const ConceptGuide = ({
  title,
  summary,
  learningFocus,
  steps,
  currentStep,
  onStepChange,
}: ConceptGuideProps) => {
  const activeRef = useRef<HTMLButtonElement>(null);
  const clampedStep = steps.length > 0 ? Math.min(Math.max(currentStep, 0), steps.length - 1) : 0;

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [clampedStep]);

  return (
    <aside className="h-full w-[300px] flex-none overflow-y-auto border-r border-white/10 bg-slate-900/60 p-5 xl:w-[340px]">
      <h3 className="mb-4 text-base font-semibold text-white">
        Concept Guide: {title}
      </h3>

      <div className="mb-5 space-y-2">
        <p className="text-sm leading-relaxed text-slate-300">{summary}</p>
        <div className="rounded-md bg-cyan-900/20 px-3 py-2">
          <p className="text-sm text-slate-200">
            <span className="font-semibold text-cyan-300">Focus: </span>
            {learningFocus}
          </p>
        </div>
      </div>

      <div className="relative">
        {steps.map((step, idx) => {
          const isActive = idx === clampedStep;
          const isCompleted = idx < clampedStep;

          return (
            <button
              key={step.title}
              ref={isActive ? activeRef : undefined}
              type="button"
              onClick={() => onStepChange(idx)}
              className="group flex w-full items-start gap-3 py-2 text-left"
            >
              <div className="relative flex flex-col items-center">
                <div
                  className={
                    isActive
                      ? 'h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.4)]'
                      : isCompleted
                        ? 'h-3 w-3 rounded-full bg-slate-500'
                        : 'h-3 w-3 rounded-full border-2 border-slate-600'
                  }
                />
                {idx < steps.length - 1 && (
                  <div
                    className={`min-h-[24px] w-0.5 flex-1 ${
                      isActive
                        ? 'bg-cyan-400/40'
                        : isCompleted
                          ? 'bg-slate-600'
                          : 'bg-slate-700'
                    }`}
                  />
                )}
              </div>

              <div className="min-w-0 pb-2">
                <span
                  className={
                    isActive
                      ? 'text-sm font-semibold text-white'
                      : isCompleted
                        ? 'text-sm font-medium text-slate-400'
                        : 'text-sm text-slate-500 group-hover:text-slate-400'
                  }
                >
                  {idx + 1}. {step.title}
                </span>
                {isActive && (
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">
                    {step.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
