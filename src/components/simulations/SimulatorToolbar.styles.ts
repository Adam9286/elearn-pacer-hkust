import { cn } from '@/lib/utils';

export const toolbarControlGroupClass = 'flex min-w-0 flex-wrap items-center gap-2';

export const toolbarSelectClass =
  'h-9 rounded-md border border-input bg-background/80 px-3 text-sm text-foreground shadow-none outline-none transition-colors hover:border-ring/50 focus:border-ring focus:ring-2 focus:ring-ring/20';

export const toolbarInputClass =
  'h-9 rounded-md border border-input bg-background/80 px-3 text-sm text-foreground shadow-none outline-none transition-colors placeholder:text-muted-foreground hover:border-ring/50 focus:border-ring focus:ring-2 focus:ring-ring/20';

export const toolbarPrimaryButtonClass =
  'border border-primary/25 bg-primary/10 text-primary shadow-none hover:bg-primary/15';

export const toolbarSecondaryButtonClass =
  'border border-border bg-background/70 text-foreground shadow-none hover:bg-muted/70';

export const toolbarDangerButtonClass =
  'border border-destructive/25 bg-destructive/10 text-destructive shadow-none hover:bg-destructive/20';

export const toolbarGhostButtonClass =
  'bg-transparent text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground';

export const toolbarToggleButtonClass = (active: boolean) =>
  cn(
    'border shadow-none',
    active
      ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15'
      : 'border-border bg-background/70 text-foreground hover:bg-muted/70'
  );
