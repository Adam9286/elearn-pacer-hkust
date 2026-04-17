import { useEffect, useMemo, useState } from 'react';

const NARRATION_COPY = [
  { afterMs: 6000, text: 'Synthesizing a grounded answer' },
  { afterMs: 3000, text: 'Retrieving relevant lecture and textbook content' },
  { afterMs: 0, text: 'Searching course materials' },
] as const;

interface NarrationStripProps {
  startedAt: number;
}

const NarrationStrip = ({ startedAt }: NarrationStripProps) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 500);

    return () => window.clearInterval(intervalId);
  }, []);

  const elapsedMs = Math.max(0, now - startedAt);
  const dots = '.'.repeat((Math.floor(elapsedMs / 500) % 3) + 1);

  const label = useMemo(() => {
    return NARRATION_COPY.find((item) => elapsedMs >= item.afterMs)?.text || NARRATION_COPY[2].text;
  }, [elapsedMs]);

  return (
    <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-xs text-slate-400">
      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)] animate-pulse" />
      <span className="font-medium text-slate-300">{label}</span>
      <span className="min-w-[1.5rem] text-left text-slate-500">{dots}</span>
    </div>
  );
};

export default NarrationStrip;
