import { cn } from '@/lib/utils';

export const toolbarControlGroupClass = 'flex min-w-0 flex-wrap items-center gap-2';

export const toolbarSelectClass =
  'h-9 rounded-md border border-white/10 bg-gray-950/40 px-3 text-sm text-foreground shadow-none outline-none transition-colors hover:border-white/20 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20';

export const toolbarInputClass =
  'h-9 rounded-md border border-white/10 bg-gray-950/40 px-3 text-sm text-foreground shadow-none outline-none transition-colors placeholder:text-gray-500 hover:border-white/20 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20';

export const toolbarPrimaryButtonClass =
  'border border-cyan-400/25 bg-cyan-500/15 text-cyan-50 shadow-none hover:bg-cyan-500/25';

export const toolbarSecondaryButtonClass =
  'border border-white/10 bg-transparent text-gray-300 shadow-none hover:bg-white/5 hover:text-white';

export const toolbarDangerButtonClass =
  'border border-red-400/20 bg-red-500/10 text-red-200 shadow-none hover:bg-red-500/20 hover:text-red-100';

export const toolbarGhostButtonClass =
  'bg-transparent text-gray-400 shadow-none hover:bg-transparent hover:text-red-300';

export const toolbarToggleButtonClass = (active: boolean) =>
  cn(
    'border shadow-none',
    active
      ? 'border-cyan-400/30 bg-cyan-500/15 text-cyan-50 hover:bg-cyan-500/25'
      : 'border-white/10 bg-transparent text-gray-300 hover:bg-white/5 hover:text-white'
  );
