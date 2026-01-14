import { Brain, Zap } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DeepThinkToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

export const DeepThinkToggle = ({
  enabled,
  onToggle,
  disabled = false,
}: DeepThinkToggleProps) => {
  const mode = enabled ? 'deepthink' : 'auto';

  const handleModeChange = (newMode: string) => {
    onToggle(newMode === 'deepthink');
  };

  return (
    <Select value={mode} onValueChange={handleModeChange} disabled={disabled}>
      <SelectTrigger 
        className={`w-[140px] h-8 text-sm border-border/50 bg-background/50 hover:bg-background/80 transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <SelectValue>
          <div className="flex items-center gap-2">
            {mode === 'auto' ? (
              <>
                <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Auto</span>
              </>
            ) : (
              <>
                <Brain className="w-3.5 h-3.5 text-primary" />
                <span className="text-primary font-medium">DeepThink</span>
              </>
            )}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="min-w-[200px]">
        <SelectItem value="auto" className="cursor-pointer">
          <div className="flex items-center gap-3 py-1">
            <Zap className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium">Auto</span>
              <span className="text-xs text-muted-foreground">Fast, adaptive responses</span>
            </div>
          </div>
        </SelectItem>
        <SelectItem value="deepthink" className="cursor-pointer">
          <div className="flex items-center gap-3 py-1">
            <Brain className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium text-primary">DeepThink</span>
              <span className="text-xs text-muted-foreground">Extended textbook knowledge</span>
            </div>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
};
