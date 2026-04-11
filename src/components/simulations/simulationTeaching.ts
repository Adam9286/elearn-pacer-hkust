export interface SimulationGlossaryItem {
  term: string;
  definition: string;
}

export interface SimulationLearnMoreSection {
  title: string;
  content: string[];
}

export interface SimulationTeachingStep {
  title: string;
  explanation: string;
  whatToNotice?: string;
  whyItMatters?: string;
}

export interface SimulationLesson {
  intro: string;
  focus: string;
  steps: SimulationTeachingStep[];
  glossary: SimulationGlossaryItem[];
  takeaway: string;
  commonMistake?: string;
  nextObservation?: string;
  learnMore?: SimulationLearnMoreSection[];
}

export const clampTeachingStep = (currentStep: number, totalSteps: number) => {
  if (totalSteps <= 0) return 0;
  return Math.min(Math.max(currentStep, 0), totalSteps - 1);
};
