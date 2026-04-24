import type { ComponentType } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  simulationCatalog,
  simulationModuleDescriptions,
  simulationModuleOrder,
  type SimulationCatalogEntry,
} from '@/data/platformContent';
import TestYourselfCard from './lesson/TestYourselfCard';
import { ArpSimulator } from './simulations/ArpSimulator';
import { CwndSimulator } from './simulations/CwndSimulator';
import { DijkstraSimulator } from './simulations/DijkstraSimulator';
import { DistanceVectorSimulator } from './simulations/DistanceVectorSimulator';
import { DnsResolutionSimulator } from './simulations/DnsResolutionSimulator';
import { EncapsulationSimulator } from './simulations/EncapsulationSimulator';
import { GbnSrSimulator } from './simulations/GbnSrSimulator';
import { LearningSwitchSimulator } from './simulations/LearningSwitchSimulator';
import { LpmSimulator } from './simulations/LpmSimulator';
import { MplsSimulator } from './simulations/MplsSimulator';
import { PipeAckClockingSimulator } from './simulations/PipeAckClockingSimulator';
import { QueueManagementSimulator } from './simulations/QueueManagementSimulator';
import { SimulationHub } from './simulations/SimulationHub';
import { SimulationShell } from './simulations/SimulationShell';
import { SlidingWindowSimulator } from './simulations/SlidingWindowSimulator';
import { StpSimulator } from './simulations/StpSimulator';
import { SubnettingCalculator } from './simulations/SubnettingCalculator';
import { TcpHandshakeSimulator } from './simulations/TcpHandshakeSimulator';
import { WirelessAssociationSimulator } from './simulations/WirelessAssociationSimulator';
import {
  simulatorGuideConfigById,
  type SimulatorGuideState,
  type SimulatorStepProps,
} from './simulations/simulatorStepConfig';

interface SimulatorConfig extends SimulationCatalogEntry {
  summary: string;
  learningFocus: string;
  component: ComponentType<SimulatorStepProps>;
}

interface QuizProgress {
  answered: boolean;
  bestCorrect: boolean;
}

const simulationComponentById: Record<string, ComponentType<SimulatorStepProps>> = {
  encapsulation: EncapsulationSimulator,
  "dns-resolution": DnsResolutionSimulator,
  subnetting: SubnettingCalculator,
  "tcp-handshake": TcpHandshakeSimulator,
  "sliding-window": SlidingWindowSimulator,
  "gbn-sr": GbnSrSimulator,
  cwnd: CwndSimulator,
  "pipe-ack-clocking": PipeAckClockingSimulator,
  lpm: LpmSimulator,
  arp: ArpSimulator,
  dijkstra: DijkstraSimulator,
  "distance-vector": DistanceVectorSimulator,
  mpls: MplsSimulator,
  "learning-switch": LearningSwitchSimulator,
  stp: StpSimulator,
  "wireless-association": WirelessAssociationSimulator,
  "queue-management": QueueManagementSimulator,
};

const simulators: SimulatorConfig[] = simulationCatalog.map((entry) => ({
  ...entry,
  component: simulationComponentById[entry.id],
}));

const SimulationsMode = () => {
  const [activeSimulatorId, setActiveSimulatorId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [runtimeGuideState, setRuntimeGuideState] = useState<SimulatorGuideState | null>(null);
  const [showExploratoryQuiz, setShowExploratoryQuiz] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizProgress, setQuizProgress] = useState<QuizProgress[]>([]);
  const [showQuizSummary, setShowQuizSummary] = useState(false);

  const activeConfig = activeSimulatorId
    ? simulators.find(sim => sim.id === activeSimulatorId) ?? null
    : null;

  const guideConfig = activeConfig
    ? simulatorGuideConfigById[activeConfig.id]
    : null;

  const activeGuideState = activeConfig && guideConfig
    ? runtimeGuideState ?? {
        steps: guideConfig.steps,
        currentStep,
        mode: guideConfig.mode,
        isComplete: guideConfig.mode === 'terminal'
          ? guideConfig.steps.length > 0 && currentStep >= guideConfig.steps.length - 1
          : false,
      }
    : null;
  const quizQuestions = guideConfig?.quizQuestions ?? [];
  const isAutoCompletionQuizVisible =
    (activeGuideState?.mode === 'terminal' || activeGuideState?.mode === 'convergence') &&
    (activeGuideState?.isComplete ?? false);
  const isExploratoryQuizVisible = activeGuideState?.mode === 'exploratory' && showExploratoryQuiz;
  const shouldShowQuiz = quizQuestions.length > 0 && (isAutoCompletionQuizVisible || isExploratoryQuizVisible);
  const currentQuizQuestion = currentQuizIndex < quizQuestions.length ? quizQuestions[currentQuizIndex] : null;
  const currentQuizProgress = quizProgress[currentQuizIndex] ?? { answered: false, bestCorrect: false };
  const answeredCount = quizProgress.filter(result => result.answered).length;
  const correctCount = quizProgress.filter(result => result.bestCorrect).length;

  const resetQuizFlow = useCallback(() => {
    setCurrentQuizIndex(0);
    setQuizProgress([]);
    setShowQuizSummary(false);
  }, []);

  useEffect(() => {
    if (!shouldShowQuiz) {
      resetQuizFlow();
    }
  }, [resetQuizFlow, shouldShowQuiz]);

  const handleSelect = useCallback((id: string) => {
    setActiveSimulatorId(id);
    setCurrentStep(0);
    setRuntimeGuideState(null);
    setShowExploratoryQuiz(false);
    resetQuizFlow();
  }, [resetQuizFlow]);

  const handleExit = useCallback(() => {
    setActiveSimulatorId(null);
    setCurrentStep(0);
    setRuntimeGuideState(null);
    setShowExploratoryQuiz(false);
    resetQuizFlow();
  }, [resetQuizFlow]);

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const handleGuideStateChange = useCallback((nextState: SimulatorGuideState) => {
    setRuntimeGuideState(nextState);
  }, []);

  const handleQuizAnswer = useCallback((correct: boolean) => {
    setQuizProgress(prev => {
      const next = [...prev];
      const current = next[currentQuizIndex] ?? { answered: false, bestCorrect: false };
      next[currentQuizIndex] = {
        answered: true,
        bestCorrect: current.bestCorrect || correct,
      };
      return next;
    });
  }, [currentQuizIndex]);

  const handleAdvanceQuiz = useCallback(() => {
    if (currentQuizIndex >= quizQuestions.length - 1) {
      setShowQuizSummary(true);
      return;
    }

    setCurrentQuizIndex(prev => prev + 1);
  }, [currentQuizIndex, quizQuestions.length]);

  if (!activeConfig) {
    return (
      <SimulationHub
        simulators={simulators}
        moduleOrder={simulationModuleOrder}
        moduleDescriptions={simulationModuleDescriptions}
        onSelect={handleSelect}
      />
    );
  }

  const SimComponent = activeConfig.component;

  return (
    <SimulationShell
      title={activeConfig.label}
      category={activeConfig.module}
      difficulty={activeConfig.difficulty}
      lectureRef={activeConfig.lectureRef}
      checkpointRel={activeConfig.checkpointRel}
      summary={activeConfig.summary}
      learningFocus={activeConfig.learningFocus}
      conceptSteps={activeGuideState?.steps ?? []}
      guideMode={activeGuideState?.mode ?? 'exploratory'}
      guideStatusLabel={activeGuideState?.statusLabel}
      isGuideComplete={activeGuideState?.isComplete ?? false}
      currentStep={activeGuideState?.currentStep ?? currentStep}
      onExit={handleExit}
    >
      <>
        <SimComponent onStepChange={handleStepChange} onGuideStateChange={handleGuideStateChange} />

        {quizQuestions.length > 0 && activeGuideState?.mode === 'exploratory' && !showExploratoryQuiz && (
          <div className="mt-4">
            <Button
              variant="outline"
              className="rounded-xl border-white/10 bg-white/[0.03] text-foreground hover:bg-white/[0.06]"
              onClick={() => {
                resetQuizFlow();
                setShowExploratoryQuiz(true);
              }}
            >
              Take Knowledge Check
            </Button>
          </div>
        )}

        {shouldShowQuiz && (
          <div className="mt-4 rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-4 md:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
                  Quick Knowledge Check
                </p>
                <h3 className="text-base font-semibold text-foreground">
                  Keep it light. Check the main idea before moving on.
                </h3>
                <p className="text-sm text-muted-foreground">
                  These questions are optional and meant to reinforce the simulator, not grade you.
                </p>
              </div>

              {!showQuizSummary && quizQuestions.length > 0 && (
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-foreground/85">
                  <span className="font-medium">Question {currentQuizIndex + 1} of {quizQuestions.length}</span>
                </div>
              )}
            </div>

            {!showQuizSummary && quizQuestions.length > 1 && (
              <div className="mt-4 flex gap-2">
                {quizQuestions.map((_, index) => {
                  const isComplete = Boolean(quizProgress[index]?.answered);
                  const isActive = index === currentQuizIndex;

                  return (
                    <div
                      key={`${activeConfig.id}-quiz-step-${index}`}
                      className={`h-2 flex-1 rounded-full transition-colors ${
                        isActive
                          ? 'bg-primary/80'
                          : isComplete
                            ? 'bg-emerald-400/70'
                            : 'bg-white/10'
                      }`}
                    />
                  );
                })}
              </div>
            )}

            <div className="mt-4">
              {showQuizSummary ? (
                <div className="rounded-[20px] border border-emerald-500/15 bg-emerald-500/5 p-5">
                  <div className="space-y-2">
                    <h4 className="text-base font-semibold text-foreground">Knowledge check complete</h4>
                    <p className="text-sm text-muted-foreground">
                      You completed {answeredCount} of {quizQuestions.length} question{quizQuestions.length === 1 ? '' : 's'} and got {correctCount} right on at least one attempt.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      The goal here is reinforcement. Replay the simulation or revisit the explanation if you want another pass.
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="rounded-xl border-white/10 bg-white/[0.03] text-foreground hover:bg-white/[0.06]"
                      onClick={resetQuizFlow}
                    >
                      Restart Questions
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <TestYourselfCard
                    key={`${activeConfig.id}-quiz-${currentQuizIndex}`}
                    question={currentQuizQuestion}
                    pageNumber={currentQuizIndex + 1}
                    badgeLabel={`Question ${currentQuizIndex + 1}`}
                    onAnswer={handleQuizAnswer}
                  />

                  {currentQuizProgress.answered && (
                    <div className="flex justify-end">
                      <Button
                        onClick={handleAdvanceQuiz}
                        className="rounded-xl"
                      >
                        {currentQuizIndex === quizQuestions.length - 1 ? 'Finish Knowledge Check' : 'Next Question'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </>
    </SimulationShell>
  );
};

export default SimulationsMode;
