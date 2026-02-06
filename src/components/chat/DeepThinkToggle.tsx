import { Zap, Brain, Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type ChatWorkflowMode = 'quick' | 'auto' | 'deepthink';

interface DeepThinkToggleProps {
  mode: ChatWorkflowMode;
  onModeChange: (mode: ChatWorkflowMode) => void;
  disabled?: boolean;
}

const modeConfig = {
  quick: { icon: Zap, label: 'Quick Answer', iconClass: 'text-muted-foreground', labelClass: '' },
  auto: { icon: Brain, label: 'Smart Answer', iconClass: 'text-accent-foreground', labelClass: 'font-medium' },
  deepthink: { icon: Search, label: 'Deep Research', iconClass: 'text-primary', labelClass: 'text-primary font-medium' },
} as const;

export const DeepThinkToggle = ({
  mode,
  onModeChange,
  disabled = false,
}: DeepThinkToggleProps) => {
  const current = modeConfig[mode];
  const Icon = current.icon;

  return (
    <Select value={mode} onValueChange={(v) => onModeChange(v as ChatWorkflowMode)} disabled={disabled}>
      <SelectTrigger 
        className={`w-[170px] h-8 text-sm border-border/50 bg-background/50 hover:bg-background/80 transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <SelectValue>
          <div className="flex items-center gap-2">
            <Icon className={`w-3.5 h-3.5 ${current.iconClass}`} />
            <span className={current.labelClass}>{current.label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="min-w-[260px]">
        <SelectItem value="quick" className="cursor-pointer">
          <div className="flex items-center gap-3 py-1">
            <Zap className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium">Quick Answer</span>
              <span className="text-xs text-muted-foreground">Fast, no memory (2-5s)</span>
            </div>
          </div>
        </SelectItem>
        <SelectItem value="auto" className="cursor-pointer">
          <div className="flex items-center gap-3 py-1">
            <Brain className="w-4 h-4 text-accent-foreground flex-shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium">Smart Answer</span>
              <span className="text-xs text-muted-foreground">Agent with tools & memory (10-20s)</span>
            </div>
          </div>
        </SelectItem>
        <SelectItem value="deepthink" className="cursor-pointer">
          <div className="flex items-center gap-3 py-1">
            <Search className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium text-primary">Deep Research</span>
              <span className="text-xs text-muted-foreground">Thorough reasoning (20-40s) with citations</span>
            </div>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
};
