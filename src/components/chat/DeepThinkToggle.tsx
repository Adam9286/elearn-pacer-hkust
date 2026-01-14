import { Brain } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  return (
    <div className="flex items-center gap-3">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Switch
                id="deepthink-mode"
                checked={enabled}
                onCheckedChange={onToggle}
                disabled={disabled}
                className="data-[state=checked]:bg-primary"
              />
              <Label
                htmlFor="deepthink-mode"
                className={`flex items-center gap-1.5 text-sm cursor-pointer select-none transition-colors ${
                  enabled ? 'text-primary font-medium' : 'text-muted-foreground'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Brain className={`w-4 h-4 ${enabled ? 'text-primary' : ''}`} />
                DeepThink
              </Label>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px]">
            <p className="text-xs">
              Enable for exam prep, derivations, and step-by-step explanations
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {enabled && (
        <span className="text-xs text-primary/80 animate-fade-in">
          Exam-level reasoning enabled
        </span>
      )}
    </div>
  );
};
