import { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface OpenRouterKeyDialogProps {
  open: boolean;
  hasSavedKey: boolean;
  isUsingDevKey?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (apiKey: string) => void;
  onClear: () => void;
}

const OpenRouterKeyDialog = ({
  open,
  hasSavedKey,
  isUsingDevKey = false,
  onOpenChange,
  onSave,
  onClear,
}: OpenRouterKeyDialogProps) => {
  const [draftKey, setDraftKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (!open) {
      setDraftKey('');
      setShowKey(false);
    }
  }, [open]);

  const trimmedKey = draftKey.trim();

  const handleSave = () => {
    if (!trimmedKey) return;
    onSave(trimmedKey);
    onOpenChange(false);
  };

  const handleClear = () => {
    onClear();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-700/80 bg-slate-900 text-slate-100 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-cyan-300" />
            OpenRouter API key
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            This key stays only in this browser session and is used only for the Compare
            pane.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <label htmlFor="compare-openrouter-api-key" className="text-sm font-medium text-slate-200">
              Enter your OpenRouter key
            </label>
            <div className="flex gap-2">
              <Input
                id="compare-openrouter-api-key"
                type={showKey ? 'text' : 'password'}
                value={draftKey}
                onChange={(event) => setDraftKey(event.target.value)}
                placeholder="sk-or-v1-..."
                autoComplete="off"
                spellCheck={false}
                className="border-slate-700/80 bg-slate-950/80 text-slate-100 placeholder:text-slate-500"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowKey((current) => !current)}
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
                className="border-slate-700/80 bg-slate-950/80 text-slate-200 hover:bg-slate-800"
              >
                {showKey ? <EyeOff /> : <Eye />}
              </Button>
            </div>
          </div>

          {isUsingDevKey ? (
            <p className="text-xs text-slate-400">
              Dev mode is currently using your local `.env` key. Saving here overrides it for
              this browser session.
            </p>
          ) : null}

          {hasSavedKey ? (
            <p className="text-xs text-slate-400">
              A key is already stored for this session. Saving again replaces it.
            </p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              disabled={!hasSavedKey && !isUsingDevKey}
              className="border-slate-700/80 bg-slate-950/80 text-slate-200 hover:bg-slate-800"
            >
              {isUsingDevKey && !hasSavedKey ? 'Stop override' : 'Clear key'}
            </Button>
          </div>
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-slate-300 hover:bg-slate-800 hover:text-slate-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!trimmedKey}
              className="bg-cyan-600 text-white hover:bg-cyan-500"
            >
              {hasSavedKey || isUsingDevKey ? 'Replace key' : 'Save key'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OpenRouterKeyDialog;
