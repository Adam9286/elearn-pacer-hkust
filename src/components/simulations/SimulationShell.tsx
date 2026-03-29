import type { ReactNode } from 'react';
import { Target } from 'lucide-react';

interface SimulationShellProps {
  title: string;
  category: string;
  summary: string;
  learningFocus: string;
  children: ReactNode;
}

export const SimulationShell = ({
  title,
  category,
  summary,
  learningFocus,
  children,
}: SimulationShellProps) => {
  return (
    <section className="space-y-5">
      {/* Mission Briefing Card */}
      <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20">
            <Target className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="space-y-2">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-200">{title}</h2>
              <p className="text-xs font-medium text-cyan-400/80">{category}</p>
            </div>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{summary}</p>
            <div className="rounded-md bg-cyan-900/30 px-3 py-2">
              <p className="text-sm text-zinc-900 dark:text-zinc-200">
                <span className="font-semibold text-cyan-300">Focus: </span>
                {learningFocus}
              </p>
            </div>
          </div>
        </div>
      </div>

      {children}
    </section>
  );
};


