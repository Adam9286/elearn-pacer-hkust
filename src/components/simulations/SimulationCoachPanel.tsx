import { useEffect } from 'react';
import { MoveRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clampTeachingStep, type SimulationLesson } from './simulationTeaching';
import { useSimulationDeepStudy } from './SimulationDeepStudyContext';

interface SimulationCoachPanelProps {
  lesson: SimulationLesson;
  currentStep: number;
  isComplete?: boolean;
  className?: string;
}

const toCoachCopy = (text: string | undefined, fallback: string) => {
  const resolved = (text ?? fallback).replace(/\s+/g, ' ').trim();
  if (!resolved) return fallback;

  const sentences = resolved.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length === 0) {
    return resolved.length > 155 ? `${resolved.slice(0, 152).trimEnd()}...` : resolved;
  }

  let summary = sentences[0];
  if (sentences.length > 1 && summary.length < 105) {
    const candidate = `${summary} ${sentences[1]}`.trim();
    if (candidate.length <= 165) {
      summary = candidate;
    }
  }

  return summary.length > 165 ? `${summary.slice(0, 162).trimEnd()}...` : summary;
};

export const SimulationCoachPanel = ({
  lesson,
  currentStep,
  isComplete = false,
  className,
}: SimulationCoachPanelProps) => {
  const deepStudy = useSimulationDeepStudy();
  const activeStepIndex = clampTeachingStep(currentStep, lesson.steps.length);
  const activeStep = lesson.steps[activeStepIndex];
  const nextStep =
    activeStepIndex < lesson.steps.length - 1 ? lesson.steps[activeStepIndex + 1] : null;

  useEffect(() => {
    deepStudy?.registerLesson(lesson);

    return () => {
      deepStudy?.registerLesson(null);
    };
  }, [deepStudy, lesson]);

  const highlightItems = [
    {
      label: "What's happening",
      value: toCoachCopy(activeStep?.explanation, lesson.intro),
    },
    {
      label: 'What to notice',
      value: toCoachCopy(activeStep?.whatToNotice, lesson.focus),
    },
    {
      label: 'Why it matters',
      value: toCoachCopy(activeStep?.whyItMatters, lesson.takeaway),
    },
    {
      label: 'Common mistake',
      value: toCoachCopy(
        lesson.commonMistake,
        'Compare this step to the one before it so you can see exactly what changed.'
      ),
    },
  ];

  const coachIntro = toCoachCopy(lesson.intro, 'Use the simulation controls to start exploring.');
  const coachFocus = toCoachCopy(lesson.focus, lesson.takeaway);
  const nextMessage = isComplete
    ? toCoachCopy(lesson.takeaway, lesson.nextObservation ?? lesson.focus)
    : nextStep
      ? toCoachCopy(`${nextStep.title}. ${nextStep.explanation}`, lesson.nextObservation ?? lesson.takeaway)
      : toCoachCopy(lesson.nextObservation, lesson.takeaway);

  return (
    <section
      className={cn(
        'rounded-[22px] border border-white/8 bg-white/[0.025] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm md:p-4.5',
        className
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/90">
          <Sparkles className="h-3.5 w-3.5" />
          Live Coach
        </div>

        <div className="rounded-[20px] border border-white/6 bg-black/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-foreground/95">
                {activeStep?.title ?? 'Start exploring the simulation'}
              </p>
              <p className="text-sm leading-6 text-muted-foreground">{coachIntro}</p>
            </div>
            <div className="shrink-0 rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-foreground/75">
              Step {activeStepIndex + 1} of {Math.max(lesson.steps.length, 1)}
            </div>
          </div>

          <div className="mt-3 rounded-2xl bg-white/[0.02] px-3 py-2.5 text-sm text-foreground/85">
            <span className="font-semibold text-primary/80">Focus:</span> {coachFocus}
          </div>

          <div className="mt-3 divide-y divide-white/6">
            {highlightItems.map((item) => (
              <div key={item.label} className="grid gap-1.5 py-3 first:pt-0 last:pb-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {item.label}
                </p>
                <p className="text-sm leading-6 text-foreground/92">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-start gap-2 border-t border-white/6 pt-3">
            <MoveRight className="mt-0.5 h-4 w-4 shrink-0 text-primary/85" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Up Next
              </p>
              <p className="mt-1 text-sm leading-6 text-foreground/88">{nextMessage}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
