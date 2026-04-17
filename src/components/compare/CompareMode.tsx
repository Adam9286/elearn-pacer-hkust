import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import CompareInput from '@/components/compare/CompareInput';
import ComparePaneLearningPacer from '@/components/compare/ComparePaneLearningPacer';
import ComparePaneOpenRouter from '@/components/compare/ComparePaneOpenRouter';
import {
  getModels,
  streamOpenRouterResponse,
} from '@/components/compare/openrouter';
import type {
  CompareMessage,
  ComparePaneState,
  OpenRouterChatMessage,
  OpenRouterModelOption,
} from '@/components/compare/types';
import { TIMEOUTS, WEBHOOKS } from '@/constants/api';
import { externalSupabase } from '@/lib/externalSupabase';
import type { RetrievedMaterial, StructuredAnswer } from '@/types/chatTypes';
import { parseWebhookAnswer } from '@/utils/parseWebhookAnswer';

const DEFAULT_MODEL = 'openai/gpt-4o';
const MODEL_STORAGE_KEY = 'compare.selectedModel';
const OPENROUTER_SYSTEM_PROMPT =
  'You are answering an undergraduate Computer Networks exam question. Be concise and precise. If you are not certain, say so.';

function createCompareSessionId() {
  return `compare-${crypto.randomUUID()}`;
}

const createLearningPacerPane = (): ComparePaneState => ({
  messages: [],
  isStreaming: false,
  isLoading: false,
  emptyTitle: 'Grounded answer appears here',
  emptyDescription:
    'LearningPacer retrieves from ELEC3120 materials first, then answers with visible source grounding.',
});

const createOpenRouterPane = (disabledMessage?: string): ComparePaneState => ({
  messages: [],
  isStreaming: false,
  isLoading: false,
  isDisabled: Boolean(disabledMessage),
  disabledMessage,
  emptyTitle: 'Baseline model answer appears here',
  emptyDescription:
    'The same prompt goes to a general model through OpenRouter. The missing citation strip is intentional.',
});

function createMessageId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function formatStructuredAnswerAsMarkdown(answer: StructuredAnswer) {
  const sections: string[] = [`## ${answer.title}`];

  if (answer.summary) {
    sections.push(answer.summary);
  }

  sections.push(answer.main_explanation);

  if (answer.table?.headers?.length && answer.table.rows?.length) {
    sections.push(
      [
        `| ${answer.table.headers.join(' | ')} |`,
        `| ${answer.table.headers.map(() => '---').join(' | ')} |`,
        ...answer.table.rows.map((row) => `| ${row.join(' | ')} |`),
      ].join('\n'),
    );
  }

  if (answer.diagram?.type === 'mermaid' && answer.diagram.code) {
    sections.push(`\`\`\`mermaid\n${answer.diagram.code}\n\`\`\``);
  }

  if (answer.elec3120_context) {
    sections.push(`**ELEC3120 context:** ${answer.elec3120_context}`);
  }

  if (answer.exam_tip) {
    sections.push(`**Exam tip:** ${answer.exam_tip}`);
  }

  if (answer.check_understanding) {
    sections.push(`**Check understanding:** ${answer.check_understanding}`);
  }

  if (answer.calculation_steps) {
    sections.push(
      [
        '### Calculation',
        answer.calculation_steps.setup,
        ...answer.calculation_steps.steps.map((step, index) => `${index + 1}. ${step}`),
        `**Answer:** ${answer.calculation_steps.answer}`,
        answer.calculation_steps.common_mistakes
          ? `**Common mistake:** ${answer.calculation_steps.common_mistakes}`
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  return sections.filter(Boolean).join('\n\n');
}

function normalizeLearningPacerContent(rawContent: string, structured: StructuredAnswer | null) {
  if (structured) {
    return formatStructuredAnswerAsMarkdown(structured);
  }

  return rawContent;
}

function chunkText(text: string, size: number) {
  const chunks: string[] = [];

  for (let index = 0; index < text.length; index += size) {
    chunks.push(text.slice(index, index + size));
  }

  return chunks;
}

function isTableHeaderLine(line: string) {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|');
}

function isTableSeparatorLine(line: string) {
  return /^\|[\s\-:|]+\|\s*$/.test(line.trim());
}

function tokenizePlainSegment(segment: string) {
  const lines = segment.split(/(?<=\n)/);
  const tokens: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const currentLine = lines[index];
    const nextLine = lines[index + 1];

    if (
      currentLine &&
      nextLine &&
      isTableHeaderLine(currentLine) &&
      isTableSeparatorLine(nextLine)
    ) {
      tokens.push(currentLine, nextLine);
      index += 2;

      while (index < lines.length && isTableHeaderLine(lines[index])) {
        tokens.push(lines[index]);
        index += 1;
      }

      continue;
    }

    const inlineMathRegex = /(\$[^$\n]+\$)/g;
    const parts = currentLine.split(inlineMathRegex).filter(Boolean);

    parts.forEach((part) => {
      if (/^\$[^$\n]+\$$/.test(part)) {
        tokens.push(part);
        return;
      }

      tokens.push(...chunkText(part, 10));
    });

    index += 1;
  }

  return tokens;
}

function findNextAtomicStart(content: string, startIndex: number) {
  const candidates = [
    content.indexOf('```', startIndex),
    content.indexOf('$$', startIndex),
    content.indexOf('\\[', startIndex),
  ].filter((index) => index >= 0);

  return candidates.length > 0 ? Math.min(...candidates) : -1;
}

function buildRevealUnits(content: string) {
  const units: string[] = [];
  let index = 0;

  while (index < content.length) {
    if (content.startsWith('```', index)) {
      const closingIndex = content.indexOf('```', index + 3);
      const endIndex = closingIndex >= 0 ? closingIndex + 3 : content.length;
      units.push(content.slice(index, endIndex));
      index = endIndex;
      continue;
    }

    if (content.startsWith('$$', index)) {
      const closingIndex = content.indexOf('$$', index + 2);
      const endIndex = closingIndex >= 0 ? closingIndex + 2 : content.length;
      units.push(content.slice(index, endIndex));
      index = endIndex;
      continue;
    }

    if (content.startsWith('\\[', index)) {
      const closingIndex = content.indexOf('\\]', index + 2);
      const endIndex = closingIndex >= 0 ? closingIndex + 2 : content.length;
      units.push(content.slice(index, endIndex));
      index = endIndex;
      continue;
    }

    const nextAtomicStart = findNextAtomicStart(content, index);
    const plainSegment = content.slice(
      index,
      nextAtomicStart >= 0 ? nextAtomicStart : content.length,
    );

    units.push(...tokenizePlainSegment(plainSegment));
    index = nextAtomicStart >= 0 ? nextAtomicStart : content.length;
  }

  return units;
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve();
    }, ms);

    const handleAbort = () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException('Aborted', 'AbortError'));
    };

    signal?.addEventListener('abort', handleAbort, { once: true });
  });
}

async function fakeStreamContent({
  content,
  signal,
  onUpdate,
}: {
  content: string;
  signal?: AbortSignal;
  onUpdate: (next: string, isFinal: boolean) => void;
}) {
  const units = buildRevealUnits(content);
  let assembled = '';

  for (const unit of units) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    assembled += unit;
    onUpdate(assembled, false);
    await sleep(20, signal);
  }

  onUpdate(assembled, true);
}

async function streamOpenRouterTypewriter({
  model,
  messages,
  signal,
  onUpdate,
  charDelayMs = 18,
}: {
  model: string;
  messages: OpenRouterChatMessage[];
  signal?: AbortSignal;
  onUpdate: (next: string, isFinal: boolean) => void;
  charDelayMs?: number;
}) {
  const queuedChars: string[] = [];
  let assembled = '';
  let producerError: unknown;
  let isProducerComplete = false;

  const producer = (async () => {
    for await (const chunk of streamOpenRouterResponse({
      model,
      messages,
      signal,
    })) {
      queuedChars.push(...Array.from(chunk));
    }
  })()
    .catch((error) => {
      producerError = error;
    })
    .finally(() => {
      isProducerComplete = true;
    });

  while (!isProducerComplete || queuedChars.length > 0) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const nextChar = queuedChars.shift();

    if (!nextChar) {
      await sleep(12, signal);
      continue;
    }

    assembled += nextChar;
    onUpdate(assembled, false);
    await sleep(charDelayMs, signal);
  }

  await producer;

  if (producerError) {
    throw producerError;
  }

  onUpdate(assembled, true);
}

function formatLearningPacerError(error: unknown) {
  const timeoutSecs = Math.round(TIMEOUTS.CHAT / 1000);

  if (error instanceof Error && error.name === 'AbortError') {
    return null;
  }

  if (error instanceof Error && error.message.startsWith('HTTP')) {
    const statusMatch = error.message.match(/HTTP (\d+)/);
    const statusCode = statusMatch ? statusMatch[1] : 'unknown';

    if (statusCode === '404') {
      return 'The LearningPacer webhook was not found. Check the configured CHAT_RESEARCH endpoint.';
    }

    if (statusCode === '500' || statusCode === '502' || statusCode === '503') {
      return 'LearningPacer is experiencing issues. Try again in a few moments.';
    }

    return `LearningPacer returned HTTP ${statusCode}. Please try again.`;
  }

  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return 'Could not connect to LearningPacer. Check the network or webhook availability.';
  }

  if (error instanceof Error && error.message.includes('timed out')) {
    return `LearningPacer timed out after ${timeoutSecs} seconds. Try a simpler question.`;
  }

  return "LearningPacer couldn't retrieve a grounded answer right now.";
}

function formatOpenRouterError(error: unknown) {
  if (error instanceof Error && error.name === 'AbortError') {
    return null;
  }

  if (error instanceof Error && error.message.startsWith('HTTP')) {
    const statusMatch = error.message.match(/HTTP (\d+)/);
    const statusCode = statusMatch ? statusMatch[1] : 'unknown';

    if (statusCode === '401' || statusCode === '403') {
      return 'OpenRouter rejected the request. Check VITE_OPENROUTER_API_KEY and referrer settings.';
    }

    if (statusCode === '429') {
      return 'OpenRouter rate limited this request. Try again in a moment.';
    }

    if (statusCode === '500' || statusCode === '502' || statusCode === '503') {
      return 'OpenRouter is experiencing issues. Try again in a few moments.';
    }

    return `OpenRouter returned HTTP ${statusCode}.`;
  }

  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return 'Could not connect to OpenRouter. Check the network or browser request policy.';
  }

  return 'OpenRouter failed to generate a response.';
}

function setMessageContent(
  messages: CompareMessage[],
  messageId: string,
  updater: (message: CompareMessage) => CompareMessage,
) {
  return messages.map((message) => (message.id === messageId ? updater(message) : message));
}

const CompareMode = () => {
  const navigate = useNavigate();
  const openRouterDisabledMessage = import.meta.env.VITE_OPENROUTER_API_KEY?.trim()
    ? undefined
    : 'Set VITE_OPENROUTER_API_KEY in .env to enable comparison.';

  const [input, setInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [learningPacerPane, setLearningPacerPane] = useState<ComparePaneState>(
    () => createLearningPacerPane(),
  );
  const [openRouterPane, setOpenRouterPane] = useState<ComparePaneState>(() =>
    createOpenRouterPane(openRouterDisabledMessage),
  );
  const [models, setModels] = useState<OpenRouterModelOption[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [selectedModel, setSelectedModel] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_MODEL;
    return window.localStorage.getItem(MODEL_STORAGE_KEY) || DEFAULT_MODEL;
  });

  const learningPacerControllerRef = useRef<AbortController | null>(null);
  const openRouterControllerRef = useRef<AbortController | null>(null);
  const activeRequestIdRef = useRef(0);
  const learningPacerSessionIdRef = useRef(createCompareSessionId());

  useEffect(() => {
    window.localStorage.setItem(MODEL_STORAGE_KEY, selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      const {
        data: { session },
      } = await externalSupabase.auth.getSession();

      if (!isMounted) return;

      setIsAuthenticated(Boolean(session?.user));
      setIsCheckingAuth(false);
    };

    checkAuth();

    const {
      data: { subscription },
    } = externalSupabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session?.user));
      setIsCheckingAuth(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadModels = async () => {
      setIsLoadingModels(true);

      try {
        const response = await getModels(controller.signal);
        if (isMounted) {
          setModels(response);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Failed to load OpenRouter models:', error);
        }
      } finally {
        if (isMounted) {
          setIsLoadingModels(false);
        }
      }
    };

    loadModels();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    setOpenRouterPane((current) => ({
      ...current,
      isDisabled: Boolean(openRouterDisabledMessage),
      disabledMessage: openRouterDisabledMessage,
    }));
  }, [openRouterDisabledMessage]);

  const abortAll = () => {
    learningPacerControllerRef.current?.abort();
    openRouterControllerRef.current?.abort();
    learningPacerControllerRef.current = null;
    openRouterControllerRef.current = null;
    activeRequestIdRef.current += 1;
    setIsSubmitting(false);
  };

  const handleClear = () => {
    abortAll();
    learningPacerSessionIdRef.current = createCompareSessionId();
    setInput('');
    setLearningPacerPane(createLearningPacerPane());
    setOpenRouterPane(createOpenRouterPane(openRouterDisabledMessage));
  };

  const runLearningPacer = async ({
    prompt,
    requestId,
    assistantMessageId,
  }: {
    prompt: string;
    requestId: number;
    assistantMessageId: string;
  }) => {
    const controller = learningPacerControllerRef.current;
    if (!controller) return;

    const timeoutId = window.setTimeout(() => controller.abort(), TIMEOUTS.CHAT);

    try {
      const response = await fetch(WEBHOOKS.CHAT_RESEARCH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: prompt,
          sessionId: learningPacerSessionIdRef.current,
          attachments: [],
          mode: 'compare',
        }),
        signal: controller.signal,
      });

      window.clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const text = await response.text();
      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from LearningPacer.');
      }

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(text) as Record<string, unknown>;
      } catch {
        throw new Error(`Invalid JSON response from LearningPacer: ${text.slice(0, 200)}`);
      }

      const payload = (data.body ?? data) as Record<string, unknown>;
      const { rawContent, structured } = parseWebhookAnswer(payload);
      const content = normalizeLearningPacerContent(rawContent, structured);
      const citations = Array.isArray(payload.citations)
        ? payload.citations.filter((citation): citation is string => typeof citation === 'string')
        : [];
      const retrievedMaterials = Array.isArray(payload.retrieved_materials)
        ? (payload.retrieved_materials as RetrievedMaterial[])
        : [];

      await fakeStreamContent({
        content,
        signal: controller.signal,
        onUpdate: (nextContent, isFinal) => {
          if (activeRequestIdRef.current !== requestId) return;

          setLearningPacerPane((current) => ({
            ...current,
            pendingStartedAt: undefined,
            messages: setMessageContent(current.messages, assistantMessageId, (message) => ({
              ...message,
              content: nextContent,
              isPending: false,
              isStreaming: !isFinal,
              pendingLabel: undefined,
              citations,
              retrievedMaterials,
            })),
          }));
        },
      });
    } catch (error) {
      window.clearTimeout(timeoutId);
      const errorContent = formatLearningPacerError(error);

      if (!errorContent || activeRequestIdRef.current !== requestId) {
        return;
      }

      setLearningPacerPane((current) => ({
        ...current,
        pendingStartedAt: undefined,
        messages: setMessageContent(current.messages, assistantMessageId, (message) => ({
          ...message,
          content: errorContent,
          isError: true,
          isPending: false,
          isStreaming: false,
          pendingLabel: undefined,
          citations: [],
          retrievedMaterials: [],
        })),
      }));
    } finally {
      window.clearTimeout(timeoutId);
      if (activeRequestIdRef.current === requestId) {
        setLearningPacerPane((current) => ({
          ...current,
          isStreaming: false,
          isLoading: false,
          pendingStartedAt: undefined,
        }));
      }
    }
  };

  const runOpenRouter = async ({
    prompt,
    model,
    requestId,
    assistantMessageId,
    history,
  }: {
    prompt: string;
    model: string;
    requestId: number;
    assistantMessageId: string;
    history: CompareMessage[];
  }) => {
    const controller = openRouterControllerRef.current;
    if (!controller) return;

    const messages: OpenRouterChatMessage[] = [
      {
        role: 'system',
        content: OPENROUTER_SYSTEM_PROMPT,
      },
      ...history
        .filter((message) => !message.isError && message.content.trim())
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),
      {
        role: 'user',
        content: prompt,
      },
    ];

    try {
      let didReceiveContent = false;

      await streamOpenRouterTypewriter({
        model,
        messages,
        signal: controller.signal,
        onUpdate: (nextContent, isFinal) => {
          if (activeRequestIdRef.current !== requestId) return;

          if (nextContent) {
            didReceiveContent = true;
          }

          setOpenRouterPane((current) => ({
            ...current,
            messages: setMessageContent(current.messages, assistantMessageId, (message) => ({
              ...message,
              content:
                isFinal && !nextContent
                  ? 'No response received from OpenRouter.'
                  : nextContent,
              isPending: false,
              isStreaming: !isFinal,
              pendingLabel: undefined,
            })),
          }));
        },
      });

      if (activeRequestIdRef.current !== requestId || didReceiveContent) {
        return;
      }

      setOpenRouterPane((current) => ({
        ...current,
        messages: setMessageContent(current.messages, assistantMessageId, (message) => ({
          ...message,
          content: 'No response received from OpenRouter.',
          isPending: false,
          isStreaming: false,
          pendingLabel: undefined,
        })),
      }));
    } catch (error) {
      const errorContent = formatOpenRouterError(error);

      if (!errorContent || activeRequestIdRef.current !== requestId) {
        return;
      }

      setOpenRouterPane((current) => ({
        ...current,
        messages: setMessageContent(current.messages, assistantMessageId, (message) => ({
          ...message,
          content: errorContent,
          isError: true,
          isPending: false,
          isStreaming: false,
          pendingLabel: undefined,
        })),
      }));
    } finally {
      if (activeRequestIdRef.current === requestId) {
        setOpenRouterPane((current) => ({
          ...current,
          isStreaming: false,
          isLoading: false,
        }));
      }
    }
  };

  const handleSubmit = async () => {
    const prompt = input.trim();
    if (!prompt || isSubmitting) return;

    const modelSnapshot = selectedModel;
    const requestId = activeRequestIdRef.current + 1;
    activeRequestIdRef.current = requestId;
    setIsSubmitting(true);
    setInput('');

    learningPacerControllerRef.current = new AbortController();
    openRouterControllerRef.current = openRouterDisabledMessage ? null : new AbortController();

    const learningPacerUserMessage: CompareMessage = {
      id: createMessageId('lp_user'),
      role: 'user',
      content: prompt,
    };
    const learningPacerAssistantMessage: CompareMessage = {
      id: createMessageId('lp_assistant'),
      role: 'assistant',
      content: '',
      isPending: true,
      isStreaming: true,
      pendingLabel: 'Retrieving from course materials...',
    };

    setLearningPacerPane((current) => ({
      ...current,
      isStreaming: true,
      isLoading: true,
      pendingStartedAt: Date.now(),
      messages: [
        ...current.messages,
        learningPacerUserMessage,
        learningPacerAssistantMessage,
      ],
    }));

    const openRouterHistory = openRouterPane.messages;
    const tasks: Promise<unknown>[] = [
      runLearningPacer({
        prompt,
        requestId,
        assistantMessageId: learningPacerAssistantMessage.id,
      }),
    ];

    if (!openRouterDisabledMessage) {
      const openRouterUserMessage: CompareMessage = {
        id: createMessageId('or_user'),
        role: 'user',
        content: prompt,
      };
      const openRouterAssistantMessage: CompareMessage = {
        id: createMessageId('or_assistant'),
        role: 'assistant',
        content: '',
        isPending: true,
        isStreaming: true,
        pendingLabel: 'Streaming from OpenRouter...',
      };

      setOpenRouterPane((current) => ({
        ...current,
        isStreaming: true,
        isLoading: true,
        messages: [
          ...current.messages,
          openRouterUserMessage,
          openRouterAssistantMessage,
        ],
      }));

      tasks.push(
        runOpenRouter({
          prompt,
          model: modelSnapshot,
          requestId,
          assistantMessageId: openRouterAssistantMessage.id,
          history: openRouterHistory,
        }),
      );
    }

    await Promise.allSettled(tasks);

    if (activeRequestIdRef.current === requestId) {
      setIsSubmitting(false);
      learningPacerControllerRef.current = null;
      openRouterControllerRef.current = null;
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-[32rem] items-center justify-center px-4 py-8">
        <div className="rounded-2xl border border-slate-700/80 bg-slate-900/80 px-6 py-5 text-sm text-slate-300">
          Checking account...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[32rem] items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg rounded-2xl border border-slate-700/80 bg-slate-900/80 p-8 text-center shadow-xl shadow-slate-950/20">
          <h2 className="text-2xl font-semibold text-slate-100">Sign in to use Compare</h2>
          <p className="mt-3 text-sm text-slate-300">
            Comparison mode is available for signed-in accounts.
          </p>
          <button
            type="button"
            onClick={() => navigate('/auth')}
            className="mt-6 inline-flex items-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-24 flex h-[calc(100vh-10rem)] min-h-[560px] max-h-[calc(100vh-10rem)] flex-col overflow-hidden">
      <CompareInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        onClear={handleClear}
        canSend={Boolean(input.trim()) && !isSubmitting}
      />

      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden py-4 lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]">
        <ComparePaneLearningPacer pane={learningPacerPane} />
        <div className="hidden bg-slate-700/60 lg:block" />
        <ComparePaneOpenRouter
          pane={openRouterPane}
          selectedModel={selectedModel}
          models={models}
          isLoadingModels={isLoadingModels}
          onModelChange={setSelectedModel}
        />
      </div>
    </div>
  );
};

export default CompareMode;
