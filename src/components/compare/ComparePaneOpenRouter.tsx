import { KeyRound } from 'lucide-react';

import ComparePane from '@/components/compare/ComparePane';
import ModelSelector from '@/components/compare/ModelSelector';
import { Button } from '@/components/ui/button';
import type {
  ComparePaneState,
  OpenRouterModelOption,
} from '@/components/compare/types';

interface ComparePaneOpenRouterProps {
  pane: ComparePaneState;
  hasApiKey: boolean;
  selectedModel: string;
  models: OpenRouterModelOption[];
  isLoadingModels: boolean;
  onModelChange: (model: string) => void;
  onOpenApiKeyDialog: () => void;
}

const ComparePaneOpenRouter = ({
  pane,
  hasApiKey,
  selectedModel,
  models,
  isLoadingModels,
  onModelChange,
  onOpenApiKeyDialog,
}: ComparePaneOpenRouterProps) => {
  const latestAssistantMessage = [...pane.messages]
    .reverse()
    .find((message) => message.role === 'assistant');

  const headerMetric = (() => {
    if (!latestAssistantMessage) {
      return <span className="text-sm text-slate-500">No answer yet</span>;
    }

    if (latestAssistantMessage.isPending || latestAssistantMessage.isStreaming) {
      return null;
    }

    return <span className="text-sm text-slate-500">0 sources</span>;
  })();

  return (
    <ComparePane
      header={
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <ModelSelector
              value={selectedModel}
              models={models}
              isLoading={isLoadingModels}
              onChange={onModelChange}
              disabled={pane.isDisabled}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenApiKeyDialog}
            className="border-slate-700/80 bg-slate-900/80 text-slate-100 hover:bg-slate-800"
          >
            <KeyRound className="h-4 w-4" />
            {hasApiKey ? 'Replace key' : 'API key'}
          </Button>
        </div>
      }
      subtitle="via OpenRouter"
      isStreaming={pane.isStreaming}
      messages={pane.messages}
      headerMetric={headerMetric}
      emptyTitle={pane.emptyTitle}
      emptyDescription={pane.emptyDescription}
      disabledMessage={pane.disabledMessage}
      renderAssistantFooter={(message) => {
        if (message.isPending) {
          return null;
        }

        return (
          <div className="mt-4 pt-3 border-t border-slate-700/60 text-xs text-slate-400">
            No sources
          </div>
        );
      }}
    />
  );
};

export default ComparePaneOpenRouter;
