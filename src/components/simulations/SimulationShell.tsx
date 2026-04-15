import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  BookOpenText,
  ChevronDown,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ConceptGuide } from './ConceptGuide';
import { SimulationDeepStudyProvider } from './SimulationDeepStudyContext';
import {
  getSimulatorStatusLabel,
  type ConceptStep,
  type SimulatorGuideMode,
} from './simulatorStepConfig';
import type { SimulationLesson } from './simulationTeaching';

interface SimulationShellProps {
  title: string;
  category: string;
  difficulty: string;
  lectureRef: string;
  checkpointRel?: string | null;
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
  difficulty: _difficulty,
  lectureRef,
  checkpointRel,
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
  const [isDeepStudyOpen, setIsDeepStudyOpen] = useState(false);
  const [deepStudyLesson, setDeepStudyLesson] = useState<SimulationLesson | null>(null);

  const clampedStep =
    conceptSteps.length > 0 ? Math.min(Math.max(currentStep, 0), conceptSteps.length - 1) : 0;
  const resolvedStatusLabel = getSimulatorStatusLabel(guideMode, isGuideComplete, guideStatusLabel);
  const deepStudyContextValue = useMemo(
    () => ({
      registerLesson: setDeepStudyLesson,
    }),
    []
  );

  return (
    <SimulationDeepStudyProvider value={deepStudyContextValue}>
      <div className="flex min-h-[calc(100vh-12rem)] flex-col overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.07),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] shadow-[0_24px_80px_rgba(2,8,23,0.26)] backdrop-blur-sm">
        <div className="border-b border-white/8 bg-black/10 px-4 py-3 md:px-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExit}
                  className="h-9 rounded-xl border-white/10 bg-white/[0.03] px-3 text-foreground hover:bg-white/[0.06] hover:text-foreground"
                >
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  Exit
                </Button>

                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className="rounded-full border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/85"
                    >
                      {category}
                    </Badge>
                    {checkpointRel && (
                      <Badge
                        variant="outline"
                        className="rounded-full border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[10px] text-foreground/70"
                      >
                        {checkpointRel}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <h2 className="truncate text-[1.7rem] font-semibold leading-tight text-foreground md:text-[1.85rem]">
                        {title}
                      </h2>
                      <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                        {summary}
                      </p>
                    </div>

                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-foreground/85">
                      <Sparkles className="h-3.5 w-3.5 text-primary/80" />
                      <span className="font-semibold">
                        Step {conceptSteps.length > 0 ? clampedStep + 1 : 0}/{conceptSteps.length}
                      </span>
                      <span className="text-muted-foreground">-</span>
                      <span className="text-muted-foreground">{resolvedStatusLabel}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <BookOpenText className="h-3.5 w-3.5 text-primary/75" />
                      {lectureRef}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="font-medium text-foreground/80">Focus:</span>
                      {learningFocus}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-white/6 bg-black/5 px-4 py-2.5 md:px-5">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {conceptSteps.map((step, idx) => (
              <div
                key={step.title}
                className={`min-w-[132px] rounded-xl border px-3 py-1.5 text-left transition-colors ${
                  idx === clampedStep
                    ? 'border-primary/35 bg-primary/10 text-foreground'
                    : idx < clampedStep
                      ? 'border-primary/20 bg-primary/5 text-foreground/85'
                      : 'border-white/8 bg-white/[0.02] text-muted-foreground'
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">Step {idx + 1}</p>
                <p className="mt-0.5 line-clamp-2 text-sm font-medium">{step.title}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3.5 md:px-4 md:py-4">
            {children}
          </div>
        </div>

        <div className="border-t border-white/8 bg-black/10 px-4 py-4 md:px-6">
          <Collapsible open={isDeepStudyOpen} onOpenChange={setIsDeepStudyOpen}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Study Guide
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Open this when you want the full concept map, key terms, exam tips, and deeper explanation.
                </p>
              </div>

              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 rounded-xl border-white/10 bg-white/[0.03] text-foreground hover:bg-white/[0.06]"
                >
                  <GraduationCap className="mr-2 h-4 w-4" />
                  {isDeepStudyOpen ? 'Hide Study Guide' : 'Open Study Guide'}
                  <ChevronDown
                    className={`ml-2 h-4 w-4 transition-transform ${isDeepStudyOpen ? 'rotate-180' : ''}`}
                  />
                </Button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent className="pt-4">
              <ConceptGuide
                title={title}
                summary={summary}
                learningFocus={learningFocus}
                steps={conceptSteps}
                currentStep={clampedStep}
                mode={guideMode}
                isComplete={isGuideComplete}
                statusLabel={guideStatusLabel}
                lesson={deepStudyLesson}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </SimulationDeepStudyProvider>
  );
};
