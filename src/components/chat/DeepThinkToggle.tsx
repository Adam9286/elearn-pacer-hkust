import { Zap, Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type ChatWorkflowMode = 'quick' | 'research';

interface DeepThinkToggleProps {
  mode: ChatWorkflowMode;
  onModeChange: (mode: ChatWorkflowMode) => void;
  disabled?: boolean;
}

export const DeepThinkToggle = ({
  mode,
  onModeChange,
  disabled = false,
}: DeepThinkToggleProps) => {
  return (
    <Select value={mode} onValueChange={(v) => onModeChange(v as ChatWorkflowMode)} disabled={disabled}>
      <SelectTrigger 
        className={`w-[160px] h-8 text-sm border-border/50 bg-background/50 hover:bg-background/80 transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <SelectValue>
          <div className="flex items-center gap-2">
            {mode === 'quick' ? (
              <>
                <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Quick Answer</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5 text-primary" />
                <span className="text-primary font-medium">Deep Research</span>
              </>
            )}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="min-w-[240px]">
        <SelectItem value="quick" className="cursor-pointer">
          <div className="flex items-center gap-3 py-1">
            <Zap className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium">Quick Answer</span>
              <span className="text-xs text-muted-foreground">Fast responses (2-5s) for simple questions</span>
            </div>
          </div>
        </SelectItem>
        <SelectItem value="research" className="cursor-pointer">
          <div className="flex items-center gap-3 py-1">
            <Search className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium text-primary">Deep Research</span>
              <span className="text-xs text-muted-foreground">Thorough answers (10-30s) with textbook citations</span>
            </div>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
};
