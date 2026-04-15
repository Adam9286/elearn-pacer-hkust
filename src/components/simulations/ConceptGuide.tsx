import { useEffect, useRef } from 'react';
import { BookOpenText, Lightbulb, Sparkles } from 'lucide-react';
import {
  getSimulatorStatusLabel,
  type ConceptStep,
  type SimulatorGuideMode,
} from './simulatorStepConfig';
import type { SimulationLesson } from './simulationTeaching';

interface ConceptGuideProps {
  title: string;
  summary: string;
  learningFocus: string;
  steps: ConceptStep[];
  currentStep: number;
  mode: SimulatorGuideMode;
  isComplete: boolean;
  statusLabel?: string;
  lesson?: SimulationLesson | null;
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
  lesson,
}: ConceptGuideProps) => {
  const activeRef = useRef<HTMLDivElement>(null);
  const clampedStep = steps.length > 0 ? Math.min(Math.max(currentStep, 0), steps.length - 1) : 0;
  const resolvedStatusLabel = getSimulatorStatusLabel(mode, isComplete, statusLabel);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [clampedStep]);

  const rememberThis = lesson
    ? `${lesson.takeaway}${lesson.nextObservation ? ` ${lesson.nextObservation}` : ''}`
    : null;

  return (
    <section className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] md:p-5">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">Study Guide for {title}</h3>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{summary}</p>
          <p className="text-sm text-foreground/90">
            <span className="font-semibold text-primary/80">Focus:</span> {learningFocus}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            {resolvedStatusLabel}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {mode}
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {steps.map((step, idx) => {
          const isActive = idx === clampedStep;
          const isCompleted = idx < clampedStep;

          return (
            <div
              key={step.title}
              ref={isActive ? activeRef : undefined}
              className={`rounded-2xl border p-4 transition-colors ${
                isActive
                  ? 'border-primary/30 bg-primary/10'
                  : isCompleted
                    ? 'border-primary/15 bg-primary/5'
                    : 'border-white/8 bg-black/10'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={
                    isActive
                      ? 'mt-1 h-3 w-3 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.35)]'
                      : isCompleted
                        ? 'mt-1 h-3 w-3 rounded-full bg-primary/60'
                        : 'mt-1 h-3 w-3 rounded-full border-2 border-white/20'
                  }
                />

                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${isActive ? 'text-foreground' : 'text-foreground/88'}`}>
                    Step {idx + 1}
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">{step.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {lesson ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="space-y-4 rounded-2xl border border-white/8 bg-black/10 p-4">
            <div className="flex items-center gap-2">
              <BookOpenText className="h-4 w-4 text-primary/85" />
              <p className="text-sm font-semibold text-foreground">Key Terms and Deeper Explanation</p>
            </div>

            <div className="space-y-3">
              {lesson.glossary.map((item) => (
                <div key={item.term} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                  <p className="text-sm font-medium text-foreground">{item.term}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.definition}</p>
                </div>
              ))}
            </div>

            {lesson.learnMore && lesson.learnMore.length > 0 ? (
              <div className="space-y-3 pt-1">
                {lesson.learnMore.map((section) => (
                  <div key={section.title} className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-sm font-semibold text-foreground">{section.title}</p>
                    <div className="mt-2 space-y-2">
                      {section.content.map((line) => (
                        <p key={line} className="text-sm leading-relaxed text-muted-foreground">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-4 rounded-2xl border border-white/8 bg-black/10 p-4">
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-400" />
                <p className="text-sm font-semibold text-foreground">Exam Tip</p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {lesson.commonMistake ?? lesson.takeaway}
              </p>
            </div>

            {rememberThis ? (
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary/85" />
                  <p className="text-sm font-semibold text-foreground">Remember This</p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{rememberThis}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
};
