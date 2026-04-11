import { BookOpenText, Lightbulb, MoveRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  clampTeachingStep,
  type SimulationLesson,
} from './simulationTeaching';

interface SimulationCoachPanelProps {
  lesson: SimulationLesson;
  currentStep: number;
  isComplete?: boolean;
  className?: string;
}

export const SimulationCoachPanel = ({
  lesson,
  currentStep,
  isComplete = false,
  className,
}: SimulationCoachPanelProps) => {
  const activeStepIndex = clampTeachingStep(currentStep, lesson.steps.length);
  const activeStep = lesson.steps[activeStepIndex];
  const nextStep = activeStepIndex < lesson.steps.length - 1
    ? lesson.steps[activeStepIndex + 1]
    : null;

  return (
    <section
      className={cn(
        'rounded-2xl border border-border/70 bg-card/85 p-4 shadow-sm backdrop-blur-sm md:p-5',
        className
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Live Coach
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">What This Scenario Is Teaching</p>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">{lesson.intro}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-sm">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Step {activeStepIndex + 1} of {Math.max(lesson.steps.length, 1)}
          </div>
          <div className="mt-1 font-medium text-foreground">
            {activeStep?.title ?? 'Start Here'}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div className="rounded-xl border border-border/60 bg-background/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            What&apos;s Happening Now
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            {activeStep?.explanation ?? lesson.intro}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            What To Notice
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            {activeStep?.whatToNotice ?? lesson.focus}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Why It Matters
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            {activeStep?.whyItMatters ?? lesson.takeaway}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-xl border border-border/60 bg-background/70 p-4">
          <div className="flex items-center gap-2">
            <BookOpenText className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Key Terms</p>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {lesson.glossary.map((item) => (
              <div key={item.term} className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                <p className="text-sm font-medium text-foreground">{item.term}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.definition}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-background/70 p-4">
            <div className="flex items-center gap-2">
              <MoveRight className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Next</p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground">
              {isComplete
                ? lesson.takeaway
                : nextStep
                  ? `${nextStep.title}: ${nextStep.explanation}`
                  : lesson.nextObservation ?? lesson.takeaway}
            </p>
          </div>

          {lesson.commonMistake && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <p className="text-sm font-semibold text-foreground">Common Mistake</p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground">{lesson.commonMistake}</p>
            </div>
          )}
        </div>
      </div>

      {lesson.learnMore && lesson.learnMore.length > 0 && (
        <div className="mt-4 space-y-2">
          {lesson.learnMore.map((section) => (
            <details
              key={section.title}
              className="rounded-xl border border-border/60 bg-background/60 p-4"
            >
              <summary className="cursor-pointer text-sm font-semibold text-foreground">
                Learn More: {section.title}
              </summary>
              <div className="mt-3 space-y-2">
                {section.content.map((line) => (
                  <p key={line} className="text-sm leading-relaxed text-muted-foreground">
                    {line}
                  </p>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
};
