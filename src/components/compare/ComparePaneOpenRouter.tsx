import ComparePane from '@/components/compare/ComparePane';
import ModelSelector from '@/components/compare/ModelSelector';
import type {
  ComparePaneState,
  OpenRouterModelOption,
} from '@/components/compare/types';

interface ComparePaneOpenRouterProps {
  pane: ComparePaneState;
  selectedModel: string;
  models: OpenRouterModelOption[];
  isLoadingModels: boolean;
  onModelChange: (model: string) => void;
}

const ComparePaneOpenRouter = ({
  pane,
  selectedModel,
  models,
  isLoadingModels,
  onModelChange,
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
        <ModelSelector
          value={selectedModel}
          models={models}
          isLoading={isLoadingModels}
          onChange={onModelChange}
          disabled={pane.isDisabled}
        />
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
