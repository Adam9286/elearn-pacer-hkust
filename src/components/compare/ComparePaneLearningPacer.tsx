import { CitationSection } from '@/components/chat/CitationSection';
import NarrationStrip from '@/components/compare/NarrationStrip';
import ComparePane from '@/components/compare/ComparePane';
import type { ComparePaneState } from '@/components/compare/types';
import { getEffectiveSourceCount } from '@/components/compare/sourceMetrics';
import { isNoCitationMessage } from '@/utils/citationParser';

interface ComparePaneLearningPacerProps {
  pane: ComparePaneState;
}

const ComparePaneLearningPacer = ({ pane }: ComparePaneLearningPacerProps) => {
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

    const sourceCount = getEffectiveSourceCount(
      latestAssistantMessage.citations,
      latestAssistantMessage.retrievedMaterials,
    );

    if (sourceCount > 0) {
      return (
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
          {sourceCount} course sources
        </span>
      );
    }

    return <span className="text-sm text-slate-500">No sources found</span>;
  })();

  return (
    <ComparePane
      header={<h2 className="text-lg font-semibold text-slate-100">LearningPacer</h2>}
      subtitle="Course-grounded RAG"
      isStreaming={pane.isStreaming}
      messages={pane.messages}
      headerMetric={headerMetric}
      emptyTitle={pane.emptyTitle}
      emptyDescription={pane.emptyDescription}
      renderAssistantPending={(message, isLatestAssistant) => {
        if (!isLatestAssistant || !pane.pendingStartedAt || !message.isPending) {
          return null;
        }

        return <NarrationStrip startedAt={pane.pendingStartedAt} />;
      }}
      renderAssistantFooter={(message, isLatestAssistant) => {
        if (
          !isLatestAssistant ||
          message.isPending ||
          message.isStreaming ||
          message.isError
        ) {
          return null;
        }

        if (message.citations && message.citations.length > 0 && !isNoCitationMessage(message.citations)) {
          return (
            <CitationSection
              citations={message.citations}
              retrievedMaterials={message.retrievedMaterials}
            />
          );
        }

        if (message.retrievedMaterials && message.retrievedMaterials.length > 0) {
          return (
            <CitationSection
              citations={message.retrievedMaterials.map((material) => material.document_title || 'Course Material')}
              retrievedMaterials={message.retrievedMaterials}
            />
          );
        }

        return null;
      }}
    />
  );
};

export default ComparePaneLearningPacer;
