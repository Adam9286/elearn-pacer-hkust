import { createContext, useContext } from 'react';
import type { SimulationLesson } from './simulationTeaching';

interface SimulationDeepStudyContextValue {
  registerLesson: (lesson: SimulationLesson | null) => void;
}

const SimulationDeepStudyContext = createContext<SimulationDeepStudyContextValue | null>(null);

export const SimulationDeepStudyProvider = SimulationDeepStudyContext.Provider;

export const useSimulationDeepStudy = () => useContext(SimulationDeepStudyContext);
