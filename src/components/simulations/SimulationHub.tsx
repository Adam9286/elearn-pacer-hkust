import type { ComponentType } from 'react';
import { useState } from 'react';
import { ArrowLeftRight, Boxes, ChevronDown, ChevronUp, Globe, Link2 } from 'lucide-react';
import { toolbarSelectClass } from './SimulatorToolbar.styles';

type ModuleName = 'Foundations' | 'Transport Layer' | 'Network Layer' | 'Link Layer';
type Difficulty = 'Introductory' | 'Intermediate' | 'Advanced';
type FilterLevel = 'all' | Difficulty;

interface SimulatorConfig {
  id: string;
  label: string;
  module: ModuleName;
  difficulty: Difficulty;
  summary: string;
}

interface SimulationHubProps {
  simulators: SimulatorConfig[];
  moduleOrder: ModuleName[];
  moduleDescriptions: Record<ModuleName, string>;
  onSelect: (id: string) => void;
}

const moduleIcons: Record<ModuleName, ComponentType<{ className?: string }>> = {
  Foundations: Boxes,
  'Transport Layer': ArrowLeftRight,
  'Network Layer': Globe,
  'Link Layer': Link2,
};

const moduleIconColors: Record<ModuleName, string> = {
  Foundations: 'text-cyan-400',
  'Transport Layer': 'text-emerald-400',
  'Network Layer': 'text-amber-400',
  'Link Layer': 'text-fuchsia-400',
};

const moduleCardHoverClass: Record<ModuleName, string> = {
  Foundations: 'hover:border-cyan-500/40',
  'Transport Layer': 'hover:border-emerald-500/40',
  'Network Layer': 'hover:border-amber-500/40',
  'Link Layer': 'hover:border-fuchsia-500/40',
};

const difficultyBadgeClass: Record<Difficulty, string> = {
  Introductory: 'bg-emerald-400/20 text-emerald-300',
  Intermediate: 'bg-amber-400/20 text-amber-300',
  Advanced: 'bg-red-400/20 text-red-300',
};

const difficultyFilterLabels: Record<FilterLevel, string> = {
  all: 'All Levels',
  Introductory: 'Beginner',
  Intermediate: 'Intermediate',
  Advanced: 'Advanced',
};

const difficultyDotClass: Record<Difficulty, string> = {
  Introductory: 'bg-emerald-400',
  Intermediate: 'bg-amber-400',
  Advanced: 'bg-red-400',
};

const getLowestDifficulty = (sims: SimulatorConfig[]): Difficulty => {
  const order: Difficulty[] = ['Introductory', 'Intermediate', 'Advanced'];
  return order.find(difficulty => sims.some(sim => sim.difficulty === difficulty)) ?? 'Introductory';
};

export const SimulationHub = ({
  simulators,
  moduleOrder,
  moduleDescriptions,
  onSelect,
}: SimulationHubProps) => {
  const [filter, setFilter] = useState<FilterLevel>('all');
  const [expandedModules, setExpandedModules] = useState<ModuleName[]>(() => [...moduleOrder]);

  const toggleModule = (module: ModuleName) => {
    setExpandedModules(prev =>
      prev.includes(module)
        ? prev.filter(expandedModule => expandedModule !== module)
        : [...prev, module]
    );
  };

  const filteredByModule = (module: ModuleName) => {
    const moduleSims = simulators.filter(sim => sim.module === module);
    if (filter === 'all') return moduleSims;
    return moduleSims.filter(sim => sim.difficulty === filter);
  };

  const visibleModules = moduleOrder.filter(module => filteredByModule(module).length > 0);

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-6 md:p-8">
        <div className="flex flex-col items-center gap-6 md:flex-row md:gap-10">
          <div className="flex w-[160px] flex-none flex-col items-center gap-1.5">
            {['Data', 'Protocol', 'Protocol', 'Gate'].map((label, idx) => (
              <div
                key={`${label}-${idx}`}
                className={`flex w-full items-center justify-center rounded-md border py-1.5 text-xs font-medium ${
                  idx === 0
                    ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-300'
                    : idx === 3
                      ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                      : 'border-slate-500/40 bg-slate-600/20 text-slate-300'
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          <div className="flex-1 text-center md:text-left">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Recommended Path
            </p>
            <h2 className="mb-2 text-2xl font-bold text-white">
              Start Your Journey: Packet Encapsulation
            </h2>
            <p className="mb-4 text-sm text-slate-300">
              Understand how data is formatted for network transmission.
            </p>
            <button
              type="button"
              onClick={() => onSelect('encapsulation')}
              className="rounded-lg bg-cyan-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-cyan-500"
            >
              Begin Simulation
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white">Explore Simulation Modules</h2>
        <select
          value={filter}
          onChange={event => setFilter(event.target.value as FilterLevel)}
          className={toolbarSelectClass}
        >
          {(Object.keys(difficultyFilterLabels) as FilterLevel[]).map(level => (
            <option key={level} value={level}>
              {difficultyFilterLabels[level]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {visibleModules.map(module => {
          const moduleSims = filteredByModule(module);
          const Icon = moduleIcons[module];
          const isExpanded = expandedModules.includes(module);
          const lowestDifficulty = getLowestDifficulty(moduleSims);

          return (
            <div
              key={module}
              className={`rounded-xl border border-slate-700/80 bg-slate-900/80 p-6 transition-colors ${moduleCardHoverClass[module]}`}
            >
              <div className="mb-4 flex justify-center">
                <div className={`flex h-16 w-16 items-center justify-center rounded-xl bg-slate-800/80 ${moduleIconColors[module]}`}>
                  <Icon className="h-8 w-8" />
                </div>
              </div>

              <h3 className="text-center text-lg font-semibold text-white">{module}</h3>
              <div className="mb-2 mt-1.5 flex justify-center">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${difficultyBadgeClass[lowestDifficulty]}`}>
                  {difficultyFilterLabels[lowestDifficulty]}
                </span>
              </div>

              <p className="mb-4 text-center text-sm text-slate-300">
                {moduleDescriptions[module]}
              </p>

              <button
                type="button"
                onClick={() => toggleModule(module)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-600 py-2 text-sm text-slate-300 transition-colors hover:border-slate-400 hover:text-white"
              >
                {isExpanded ? 'Collapse' : 'Explore'}
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {isExpanded && (
                <div className="mt-4 space-y-1 border-t border-slate-700/60 pt-3">
                  {moduleSims.map(sim => (
                    <button
                      key={sim.id}
                      type="button"
                      onClick={() => onSelect(sim.id)}
                      className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-800/60"
                    >
                      <span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${difficultyDotClass[sim.difficulty]}`} />
                      <div className="min-w-0">
                        <span className="block text-sm font-medium text-slate-200">{sim.label}</span>
                        <span className="block text-sm leading-relaxed text-slate-400">{sim.summary}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
