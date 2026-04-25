import { useState, useRef, useEffect } from 'react';
import {
  Send,
  BookOpen,
  MessageSquare,
  Loader2,
  Paperclip,
  X,
  LogIn,
  Database,
  Calculator,
  Network,
  GraduationCap,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { externalSupabase } from '@/lib/externalSupabase';
import { AIThinkingIndicator } from '@/components/AIThinkingIndicator';
import { RenderMarkdown } from './RenderMarkdown';
import { StructuredResponse } from './StructuredResponse';
import {
  DEFAULT_CHAT_RESPONSE_STYLE,
  ChatMessage,
  ChatResponseStyle,
  RetrievedMaterial,
  StructuredAnswer,
  normalizeChatResponseStyle,
} from '@/types/chatTypes';
import { parseWebhookAnswer } from '@/utils/parseWebhookAnswer';
import { LectureReferences, RetrievedMaterial as LegacyRetrievedMaterial } from './LectureReferences';
import { CitationSection } from './CitationSection';
import { NoCitationNotice } from './NoCitationNotice';
import { isNoCitationMessage } from '@/utils/citationParser';
import { Link } from 'react-router-dom';
import { WEBHOOKS } from '@/constants/api';
import { validateFiles, validateImageFile } from '@/utils/fileValidation';
import { UPLOAD_CONFIG, ALLOWED_TYPES_DISPLAY } from '@/constants/upload';
import { formatSource } from '@/utils/sourceFormatter';
import { computeFileHash } from '@/utils/fileHash';
import { useAutosizeTextarea } from '@/hooks/useAutosizeTextarea';

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  structured_answer?: StructuredAnswer;
  source?: string; // Legacy
  citations?: string[]; // Raw citation strings
  retrieved_materials?: RetrievedMaterial[]; // Full material data
  responseTime?: string;
  responseStyle?: ChatResponseStyle;
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
}

interface ChatConversationProps {
  messages: ChatMessage[];
  isLoadingMessages: boolean;
  isAuthenticated: boolean;
  isWaitingForAI?: boolean;
  onSendMessage: (
    content: string,
    attachments: File[],
    responseStyle: ChatResponseStyle,
  ) => Promise<void>;
}

const WELCOME_MESSAGE: LocalMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hello! I'm LearningPacer, your AI teaching assistant for ELEC3120. I can answer questions about Computer Networks based on your course materials. What would you like to learn today?",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getWebhookPayload(data: unknown): unknown {
  if (isRecord(data) && isRecord(data.body)) {
    return data.body;
  }
  return data;
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function getRetrievedMaterials(value: unknown): RetrievedMaterial[] {
  return Array.isArray(value) ? (value as RetrievedMaterial[]) : [];
}

const RESPONSE_STYLE_OPTIONS: Array<{
  value: ChatResponseStyle;
  label: string;
  description: string;
}> = [
  {
    value: 'quick_answer',
    label: 'Quick Answer',
    description: 'Concise recap or direct conceptual answer.',
  },
  {
    value: 'full_explanation',
    label: 'Full Explanation',
    description: 'Teach from basics with step-by-step depth.',
  },
];

const QUICK_ACTIONS = [
  {
    label: 'Show worked example',
    prompt: 'For the topic above, show me a concrete worked example.',
    Icon: Calculator,
  },
  {
    label: 'Draw diagram',
    prompt: 'For the topic above, draw a simple diagram and explain it briefly.',
    Icon: Network,
  },
  {
    label: 'Make exam-focused',
    prompt: 'For the topic above, summarize the exam-focused wording and common traps.',
    Icon: GraduationCap,
  },
] as const;

const RESPONSE_STYLE_LABELS: Record<ChatResponseStyle, string> = {
  quick_answer: 'Quick Answer',
  full_explanation: 'Full Explanation',
};

export const ChatConversation = ({
  messages,
  isLoadingMessages,
  isAuthenticated,
  isWaitingForAI = false,
  onSendMessage,
}: ChatConversationProps) => {
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [responseStyle, setResponseStyle] = useState<ChatResponseStyle>(DEFAULT_CHAT_RESPONSE_STYLE);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [localLoadingProgress, setLocalLoadingProgress] = useState(0);
  const [localLoadingStage, setLocalLoadingStage] = useState('');
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [newMessageId, setNewMessageId] = useState<string | null>(null);
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { resetHeight } = useAutosizeTextarea(inputRef, input, {
    minHeight: 80,
    maxHeight: 260,
  });
  const canAttachFiles = isAuthenticated;

  // Determine active loading state based on auth
  const activeIsWaitingForAI = isAuthenticated ? isWaitingForAI : isLoading;

  // Local messages for non-authenticated users or during loading
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([WELCOME_MESSAGE]);

  // Combine database messages with welcome message
  const displayMessages: LocalMessage[] = isAuthenticated && messages.length > 0
    ? messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        structured_answer: m.structured_answer,
        source: m.source,
        citations: m.citations,
        retrieved_materials: m.retrieved_materials,
        responseTime: m.responseTime,
        responseStyle: m.responseStyle ?? (
          m.structured_answer?.response_style
            ? normalizeChatResponseStyle(m.structured_answer.response_style)
            : undefined
        ),
        attachments: m.attachments,
      }))
    : localMessages;

  // Track if user is at bottom of scroll area
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      // Consider "at bottom" if within 100px of the bottom
      const atBottom = scrollHeight - scrollTop - clientHeight < 100;
      setIsUserAtBottom(atBottom);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll to bottom only when user is already at bottom
  useEffect(() => {
    if (!isUserAtBottom) return;

    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 50);
      }
    }
  }, [displayMessages, activeIsWaitingForAI, isUserAtBottom]);

  useEffect(() => {
    if (!canAttachFiles && attachments.length > 0) {
      setAttachments([]);
    }
  }, [attachments.length, canAttachFiles]);

  const showAttachmentSignInToast = () => {
    toast({
      title: 'Sign in to upload files',
      description: 'File and image uploads are available after signing in.',
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canAttachFiles) {
      showAttachmentSignInToast();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const files = Array.from(e.target.files || []);
    const { validFiles, errors } = validateFiles(files);

    errors.forEach((error) => {
      toast({
        title: 'Invalid file',
        description: error,
        variant: 'destructive',
      });
    });

    setAttachments((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canAttachFiles) return;
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canAttachFiles) return;
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (!canAttachFiles) {
      if (files.length > 0) showAttachmentSignInToast();
      return;
    }

    const { validFiles, errors } = validateFiles(files);

    errors.forEach((error) => {
      toast({
        title: 'Invalid file',
        description: error,
        variant: 'destructive',
      });
    });

    setAttachments((prev) => [...prev, ...validFiles]);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);
    const imageFiles = items
      .filter((item) => item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (imageFiles.length === 0) return;
    e.preventDefault();

    if (!canAttachFiles) {
      showAttachmentSignInToast();
      return;
    }

    const validFiles: File[] = [];
    imageFiles.forEach((file) => {
      const result = validateImageFile(file);
      if (result.valid) {
        validFiles.push(file);
      } else if (result.error) {
        toast({
          title: 'Invalid image',
          description: result.error,
          variant: 'destructive',
        });
      }
    });

    if (validFiles.length > 0) {
      setAttachments((prev) => [...prev, ...validFiles]);
      toast({
        title: 'Image pasted',
        description: `${validFiles.length} image(s) added to your message`,
      });
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;
    if (!isAuthenticated && attachments.length > 0) {
      showAttachmentSignInToast();
      return;
    }

    const currentAttachments = [...attachments];
    const userInput = input;

    // For non-authenticated users, handle locally
    if (!isAuthenticated) {
      const userMessage: LocalMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: userInput || '📎 Sent attachment(s)',
        attachments: currentAttachments.map((file) => ({
          name: file.name,
          url: URL.createObjectURL(file),
          type: file.type,
        })),
      };

      setLocalMessages((prev) => [...prev, userMessage]);
      setInput('');
      setAttachments([]);
      resetHeight();
      setIsLoading(true);

      // Initialize progress tracking
      setLocalLoadingProgress(0);
      setLocalLoadingStage('Uploading files');
      setEstimatedTime(15);

      const loadingMessage: LocalMessage = {
        id: `loading_${Date.now()}`,
        role: 'assistant',
        content: "I received your question and I'm processing it…",
      };
      setLocalMessages((prev) => [...prev, loadingMessage]);

      // Track response time
      const startTime = Date.now();

      try {
        // Upload attachments to external Supabase with duplicate detection
        const uploadedUrls: string[] = [];

        for (const file of currentAttachments) {
          const fileHash = await computeFileHash(file);
          const hashedFileName = `${fileHash}_${file.name}`;
          const filePath = `guest/${hashedFileName}`;

          // Check for existing duplicate
          const { data: existingFile } = await externalSupabase.storage
            .from('chat-attachments')
            .list('guest', { search: hashedFileName });

          if (existingFile && existingFile.length > 0) {
            // Reuse existing file
            const { data: urlData } = externalSupabase.storage
              .from('chat-attachments')
              .getPublicUrl(filePath);
            uploadedUrls.push(urlData.publicUrl);
            console.log(`♻️ Guest duplicate reused: ${file.name}`);
            continue;
          }

          // Upload new file
          const { data: uploadData, error: uploadError } = await externalSupabase.storage
            .from('chat-attachments')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            toast({
              title: 'Upload failed',
              description: `Failed to upload ${file.name}`,
              variant: 'destructive',
            });
            continue;
          }

          const { data: urlData } = externalSupabase.storage
            .from('chat-attachments')
            .getPublicUrl(uploadData.path);
          uploadedUrls.push(urlData.publicUrl);
          console.log(`✅ Guest uploaded: ${file.name}`);
        }

        setLocalLoadingProgress(20);
        setLocalLoadingStage('Understanding question');
        setEstimatedTime(12);

        await new Promise((resolve) => setTimeout(resolve, 1500));
        setLocalLoadingProgress(40);
        setLocalLoadingStage('Searching course materials');
        setEstimatedTime(10);

        const response = await fetch(WEBHOOKS.CHAT_RESEARCH, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: userInput,
            sessionId: `session_${Date.now()}`,
            attachments: uploadedUrls,
            mode: 'auto',
            responseStyle,
          }),
        });

        setLocalLoadingProgress(70);
        setLocalLoadingStage('Generating response');
        setEstimatedTime(5);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const text = await response.text();
        if (!text || text.trim().length === 0) {
          throw new Error('Empty response from AI server. Check that your n8n webhook is configured to return a JSON response body.');
        }
        let data: unknown;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Invalid JSON response from AI server: ${text.slice(0, 200)}`);
        }

        setLocalLoadingProgress(90);
        setLocalLoadingStage('Finalizing answer');
        setEstimatedTime(2);

        await new Promise((resolve) => setTimeout(resolve, 500));

        const payload = getWebhookPayload(data);
        const payloadRecord = isRecord(payload) ? payload : {};
        const { rawContent, structured } = parseWebhookAnswer(payload, responseStyle);
        const citations = getStringArray(payloadRecord.citations);
        const retrievedMaterials = getRetrievedMaterials(payloadRecord.retrieved_materials);
        // Legacy fallback
        const source = getString(payloadRecord.source_document ?? payloadRecord.source);

        const responseTime = ((Date.now() - startTime) / 1000).toFixed(2);

        setLocalMessages((prev) => {
          const withoutLoading = prev.filter((msg) => msg.id !== loadingMessage.id);
          const aiMessage: LocalMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: rawContent,
            structured_answer: structured ?? undefined,
            citations: citations.length > 0 ? citations : undefined,
            retrieved_materials: retrievedMaterials.length > 0 ? retrievedMaterials : undefined,
            source: retrievedMaterials.length === 0 && citations.length === 0 ? source : undefined,
            responseTime: responseTime,
            responseStyle,
          };
          setNewMessageId(aiMessage.id);
          setTimeout(() => setNewMessageId(null), 400);
          return [...withoutLoading, aiMessage];
        });
      } catch (error) {
        console.error('Error calling n8n webhook:', error);
        
        // Determine error message based on error type
        const isHttpError = error instanceof Error && error.message.startsWith('HTTP');
        const isNetworkError = error instanceof TypeError && (error as TypeError).message === 'Failed to fetch';
        
        let errorContent: string;
        if (isHttpError) {
          // Extract status code from error message
          const statusMatch = error.message.match(/HTTP (\d+)/);
          const statusCode = statusMatch ? statusMatch[1] : 'unknown';
          if (statusCode === '404') {
            errorContent = "The AI service endpoint was not found. Please check your webhook configuration.";
          } else if (statusCode === '500' || statusCode === '502' || statusCode === '503') {
            errorContent = "The AI server is experiencing issues. Please try again in a few moments.";
          } else {
            errorContent = `Server error (${statusCode}). Please try again or contact support if the issue persists.`;
          }
        } else if (isNetworkError) {
          errorContent = "Could not connect to the AI server. This may be a network or CORS issue. Please check your connection and try again.";
        } else {
          errorContent = "Hmm, I couldn't retrieve a course-specific answer right now. Please try rephrasing your question or check back later.";
        }
        
        setLocalMessages((prev) => {
          const withoutLoading = prev.filter((msg) => msg.id !== loadingMessage.id);
          const errorMessage: LocalMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: errorContent,
          };
          return [...withoutLoading, errorMessage];
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      // For authenticated users, delegate to parent
      setInput('');
      setAttachments([]);
      resetHeight();
      setIsLoading(true);
      
      try {
        await onSendMessage(userInput, currentAttachments, responseStyle);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Reset local messages when switching to a new conversation
  useEffect(() => {
    if (isAuthenticated && messages.length === 0) {
      setLocalMessages([WELCOME_MESSAGE]);
    }
  }, [isAuthenticated, messages.length]);

  const insertQuickActionPrompt = (prompt: string) => {
    setInput((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}\n\n${prompt}` : prompt;
    });
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div className="flex h-full min-h-0 flex-col">

      {/* Auth prompt for non-authenticated users */}
      {!isAuthenticated && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-muted/50 border border-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LogIn className="w-4 h-4" />
            <span>Sign in to save your chat history</span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      )}

      {/* Chat Interface */}
      <Card className="glass-card mx-4 my-4 flex min-h-0 flex-1 flex-col overflow-hidden shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-primary/80 to-accent/70 py-3">
          <CardTitle className="flex items-center gap-2 text-white">
            <MessageSquare className={`w-5 h-5 ${isLoading ? 'animate-pulse' : ''}`} />
            Ask Questions
          </CardTitle>
        </CardHeader>
        <CardContent
          className={`p-0 relative flex-1 flex flex-col overflow-hidden transition-all ${
            isDraggingOver ? 'ring-2 ring-primary ring-inset' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDraggingOver && (
            <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm z-10 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <Paperclip className="w-12 h-12 mx-auto mb-2 text-primary animate-bounce" />
                <p className="text-lg font-semibold text-primary">Drop files here</p>
                <p className="text-sm text-muted-foreground">PDF, PNG, JPG, or TXT (max 20MB)</p>
              </div>
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="min-h-0 flex-1 p-4" ref={scrollAreaRef}>
            {isLoadingMessages ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                    <Skeleton className="h-16 w-3/4 rounded-2xl" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {displayMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} ${
                      message.id === newMessageId ? 'animate-slide-up' : ''
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 transition-smooth ${
                        message.role === 'user'
                          ? 'gradient-primary text-white shadow-glow'
                          : 'glass-card text-foreground'
                      }`}
                    >
                      {message.content === "I received your question and I'm processing it…" ? (
                        <AIThinkingIndicator isActive={true} />
                      ) : (
                        <>
                          {message.role === 'assistant' && (message.retrieved_materials?.length > 0 || message.responseTime || message.responseStyle) && (
                            <div className="mb-2 flex items-center gap-2 border-b border-border/40 pb-1.5">
                              {message.responseStyle && (
                                <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                  message.responseStyle === 'quick_answer'
                                    ? 'bg-info/15 text-info'
                                    : 'bg-muted/50 text-muted-foreground'
                                }`}>
                                  {RESPONSE_STYLE_LABELS[message.responseStyle]}
                                </span>
                              )}
                              {message.responseStyle && (message.retrieved_materials?.length > 0 || message.responseTime) && (
                                <span className="text-[10px] text-muted-foreground/30">·</span>
                              )}
                              {message.retrieved_materials && message.retrieved_materials.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/60 bg-muted/20 px-1.5 py-0.5 rounded">
                                  <Database className="w-2.5 h-2.5" />
                                  Sources {message.retrieved_materials.length}
                                </span>
                              )}
                              {message.retrieved_materials && message.retrieved_materials.length > 0 && message.responseTime && (
                                <span className="text-[10px] text-muted-foreground/30">·</span>
                              )}
                              {message.responseTime && (
                                <span className="text-[10px] text-muted-foreground/50 font-mono">{message.responseTime}s</span>
                              )}
                            </div>
                          )}
                          <div className="text-sm leading-relaxed">
                            {message.structured_answer ? (
                              <StructuredResponse answer={message.structured_answer} />
                            ) : (
                              <RenderMarkdown content={message.content} />
                            )}
                          </div>
                        </>
                      )}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {message.attachments.map((attachment, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/40 px-3 py-2 text-xs"
                            >
                              <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate flex-1">{attachment.name}</span>
                              {attachment.type.includes('pdf') && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  PDF
                                </Badge>
                              )}
                              {attachment.type.includes('image') && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  Image
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Citation Section - show if valid citations exist */}
                      {message.citations && message.citations.length > 0 && !isNoCitationMessage(message.citations) && (
                        <CitationSection
                          citations={message.citations}
                          retrievedMaterials={message.retrieved_materials}
                        />
                      )}
                      {/* Fallback: build citations from retrieved_materials if citations empty/failed */}
                      {(!message.citations || message.citations.length === 0 || isNoCitationMessage(message.citations)) && 
                        message.retrieved_materials && message.retrieved_materials.length > 0 && (
                        <CitationSection
                          citations={message.retrieved_materials.map(m => m.document_title || 'Course Material')}
                          retrievedMaterials={message.retrieved_materials}
                        />
                      )}
                      {/* Only show General Knowledge if truly no materials */}
                      {message.citations && isNoCitationMessage(message.citations) && 
                        (!message.retrieved_materials || message.retrieved_materials.length === 0) && (
                        <NoCitationNotice />
                      )}
                      {/* Legacy fallback: source string */}
                      {!message.retrieved_materials && !message.citations && message.source && (
                        <div className="mt-3 pt-2 border-t border-border/30">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span className="font-medium">Source:</span>
                            <Badge 
                              variant="secondary" 
                              className="text-xs px-2 py-0.5 bg-primary/10 text-primary border-0 font-medium"
                            >
                              {formatSource(message.source).label}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="sticky bottom-0 border-t bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 space-y-3">
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Response style
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                {RESPONSE_STYLE_OPTIONS.map((option) => {
                  const isActive = responseStyle === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setResponseStyle(option.value)}
                      className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                        isActive
                          ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                          : 'border-border/50 bg-muted/20 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      }`}
                    >
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className="mt-0.5 block text-xs leading-5 opacity-80">{option.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Ask for
              </span>
              {QUICK_ACTIONS.map(({ label, prompt, Icon }) => (
                <Button
                  key={label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => insertQuickActionPrompt(prompt)}
                  disabled={isLoading}
                  className="h-8 gap-1.5 rounded-lg px-2.5 text-xs"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Button>
              ))}
            </div>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1 px-2 py-1">
                    <Paperclip className="w-3 h-3" />
                    <span className="text-xs">{file.name}</span>
                    <button onClick={() => removeAttachment(index)} className="ml-1 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.txt"
                className="hidden"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading || !canAttachFiles}
                      className="shrink-0"
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {canAttachFiles 
                      ? "Attach files (PDF, images, text)"
                      : "Sign in to upload files"
                    }
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex-1">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (!isLoading) {
                        void handleSend();
                      }
                    }
                  }}
                  placeholder="Ask about TCP flow control, routing algorithms, or any ELEC3120 topic..."
                  className="min-h-[80px] max-h-[260px] resize-none overflow-y-hidden"
                  disabled={isLoading}
                />
              </div>
              <Button
                onClick={() => void handleSend()}
                className="gradient-primary shadow-glow hover:animate-pulse-glow transition-smooth shrink-0"
                disabled={isLoading}
                size="icon"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
