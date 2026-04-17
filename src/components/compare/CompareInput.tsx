import { useEffect, useRef } from 'react';
import { Eraser, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAutosizeTextarea } from '@/hooks/useAutosizeTextarea';

interface CompareInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  canSend: boolean;
}

const CompareInput = ({
  value,
  onChange,
  onSubmit,
  onClear,
  canSend,
}: CompareInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { resetHeight } = useAutosizeTextarea(textareaRef, value, {
    minHeight: 48,
    maxHeight: 144,
  });

  useEffect(() => {
    if (!value) {
      resetHeight();
    }
  }, [resetHeight, value]);

  return (
    <div className="sticky top-0 z-30 border-b border-slate-700/60 bg-slate-950/95 px-4 py-4 backdrop-blur">
      <div className="rounded-2xl border border-slate-700/80 bg-slate-900/80 p-3 shadow-lg shadow-slate-950/20">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault();
                  if (canSend) {
                    onSubmit();
                  }
                }

                if (event.key === 'Escape') {
                  event.currentTarget.blur();
                }
              }}
              rows={1}
              placeholder="Ask the same ELEC3120 question to both systems…"
              className="min-h-12 resize-none border-slate-700/80 bg-slate-900/80 text-sm text-slate-300 placeholder:text-slate-500 focus-visible:ring-cyan-500/40"
            />
            <div className="mt-2 flex items-center justify-between px-1 text-xs text-slate-400">
              <span>Cmd/Ctrl+Enter to submit</span>
              <span>Escape to blur</span>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClear}
            className="shrink-0 text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
            aria-label="Clear comparison"
          >
            <Eraser className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!canSend}
            className="shrink-0 bg-cyan-600 text-white hover:bg-cyan-500"
          >
            <Send className="mr-2 h-4 w-4" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompareInput;
