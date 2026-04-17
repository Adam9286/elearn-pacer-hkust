import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

import { RenderMarkdown } from '@/components/chat/RenderMarkdown';
import type { CompareMessage } from '@/components/compare/types';
import { cn } from '@/lib/utils';

interface ComparePaneProps {
  header: ReactNode;
  subtitle: string;
  isStreaming: boolean;
  messages: CompareMessage[];
  headerMetric?: ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  disabledMessage?: string;
  renderAssistantPending?: (message: CompareMessage, isLatestAssistant: boolean) => ReactNode;
  renderAssistantFooter?: (message: CompareMessage, isLatestAssistant: boolean) => ReactNode;
}

const ComparePane = ({
  header,
  subtitle,
  isStreaming,
  messages,
  headerMetric,
  emptyTitle,
  emptyDescription,
  disabledMessage,
  renderAssistantPending,
  renderAssistantFooter,
}: ComparePaneProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [messages.length]);

  const showEmptyState = messages.length === 0;
  const latestAssistantMessageId = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant')?.id;

  return (
    <section className="flex min-h-[24rem] flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/80">
      <header className="sticky top-0 z-10 border-b border-slate-700/60 bg-slate-800/60 px-4 py-4 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">{header}</div>
          <div className="ml-auto flex min-w-fit flex-wrap items-center justify-end gap-x-3 gap-y-2 max-lg:w-full max-lg:justify-between">
            {headerMetric}
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
              <span
                className={cn(
                  'h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]',
                  isStreaming ? 'animate-pulse' : 'opacity-40',
                )}
              />
              <span>{isStreaming ? 'Streaming' : 'Idle'}</span>
            </div>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-300">{subtitle}</p>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-4">
        {disabledMessage ? (
          <div className="flex h-full min-h-[16rem] items-center justify-center">
            <div className="max-w-md rounded-2xl border border-slate-700/80 bg-slate-800/60 p-6 text-center">
              <h3 className="text-base font-semibold text-slate-100">Pane unavailable</h3>
              <p className="mt-2 text-sm text-slate-300">{disabledMessage}</p>
            </div>
          </div>
        ) : showEmptyState ? (
          <div className="flex h-full min-h-[16rem] items-center justify-center">
            <div className="max-w-md text-center">
              <h3 className="text-base font-semibold text-slate-100">{emptyTitle}</h3>
              <p className="mt-2 text-sm text-slate-300">{emptyDescription}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isLatestAssistant = message.id === latestAssistantMessageId;
              const assistantPending =
                message.role === 'assistant'
                  ? renderAssistantPending?.(message, isLatestAssistant)
                  : null;
              const assistantFooter =
                message.role === 'assistant'
                  ? renderAssistantFooter?.(message, isLatestAssistant)
                  : null;

              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start',
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[88%] rounded-2xl px-4 py-3',
                      message.role === 'user'
                        ? 'bg-cyan-600 text-white'
                        : message.isError
                          ? 'border border-red-500/40 bg-red-500/10 text-red-100'
                          : 'border border-slate-700/60 bg-slate-800/60 text-slate-300',
                    )}
                  >
                    {message.role === 'assistant' ? (
                      <>
                        {message.isPending && !message.content ? (
                          assistantPending || (
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                              <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)] animate-pulse" />
                              <span>{message.pendingLabel || 'Working...'}</span>
                            </div>
                          )
                        ) : (
                          <div className="text-sm text-slate-300">
                            <RenderMarkdown content={message.content} />
                          </div>
                        )}
                        {assistantFooter}
                      </>
                    ) : (
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default ComparePane;
