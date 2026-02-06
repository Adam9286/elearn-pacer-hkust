import { useState, useRef, useEffect } from 'react';
import { Send, BookOpen, MessageSquare, Loader2, Paperclip, X, LogIn } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { DeepThinkToggle, type ChatWorkflowMode } from './DeepThinkToggle';
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
import { ChatMessage, RetrievedMaterial } from '@/types/chatTypes';
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

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: string; // Legacy
  citations?: string[]; // NEW - Raw citation strings
  retrieved_materials?: RetrievedMaterial[]; // NEW - Full material data
  responseTime?: string;
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
  chatMode?: ChatWorkflowMode;
  onChatModeChange?: (mode: ChatWorkflowMode) => void;
  onSendMessage: (
    content: string,
    attachments: File[]
  ) => Promise<void>;
}

const WELCOME_MESSAGE: LocalMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hello! I'm LearningPacer, your AI teaching assistant for ELEC3120. I can answer questions about Computer Networks based on your course materials. What would you like to learn today?",
};

export const ChatConversation = ({
  messages,
  isLoadingMessages,
  isAuthenticated,
  isWaitingForAI = false,
  chatMode = 'quick',
  onChatModeChange,
  onSendMessage,
}: ChatConversationProps) => {
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [localLoadingProgress, setLocalLoadingProgress] = useState(0);
  const [localLoadingStage, setLocalLoadingStage] = useState('');
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [newMessageId, setNewMessageId] = useState<string | null>(null);
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

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
        source: m.source,
        citations: m.citations,
        retrieved_materials: m.retrieved_materials,
        responseTime: m.responseTime,
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = Array.from(e.dataTransfer.files);
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

        const webhookUrl = chatMode === 'quick' ? WEBHOOKS.CHAT_QUICK : WEBHOOKS.CHAT_RESEARCH;
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: userInput,
            sessionId: `session_${Date.now()}`,
            attachments: uploadedUrls,
            mode: chatMode,
          }),
        });

        setLocalLoadingProgress(70);
        setLocalLoadingStage('Generating response');
        setEstimatedTime(5);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        setLocalLoadingProgress(90);
        setLocalLoadingStage('Finalizing answer');
        setEstimatedTime(2);

        await new Promise((resolve) => setTimeout(resolve, 500));

        const payload = data.body ?? data;
        const answer = payload.answer ?? payload.output ?? "I received your question and I'm processing it.";
        const citations = payload.citations ?? [];
        const retrievedMaterials = payload.retrieved_materials ?? [];
        // Legacy fallback
        const source = payload.source_document ?? payload.source;

        const responseTime = ((Date.now() - startTime) / 1000).toFixed(2);

        setLocalMessages((prev) => {
          const withoutLoading = prev.filter((msg) => msg.id !== loadingMessage.id);
          const aiMessage: LocalMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: answer,
            citations: citations.length > 0 ? citations : undefined,
            retrieved_materials: retrievedMaterials.length > 0 ? retrievedMaterials : undefined,
            source: retrievedMaterials.length === 0 && citations.length === 0 ? source : undefined, // Fallback to legacy
            responseTime: responseTime,
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
      setIsLoading(true);
      
      try {
        await onSendMessage(userInput, currentAttachments);
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

  return (
    <div className="flex flex-col h-full">

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
      <Card className="glass-card shadow-lg flex-1 mx-4 my-4 flex flex-col overflow-hidden">
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
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
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
                        <div className="text-sm leading-relaxed">
                          <RenderMarkdown content={message.content} />
                        </div>
                      )}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {message.attachments.map((attachment, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 text-xs bg-background/30 rounded-lg px-3 py-2 border border-white/10"
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
                      {message.role === 'assistant' && message.responseTime && (
                        <div className="mt-2 text-[10px] text-muted-foreground/70 font-mono">
                          ⏱ {message.responseTime}s
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t bg-background/50 space-y-3">
            {/* Chat Mode Toggle */}
            {onChatModeChange && (
              <DeepThinkToggle
                mode={chatMode}
                onModeChange={onChatModeChange}
                disabled={activeIsWaitingForAI}
              />
            )}

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
            <div className="flex gap-2">
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
                      disabled={isLoading || !isAuthenticated}
                      className="shrink-0"
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isAuthenticated 
                      ? "Attach files (PDF, images, text)"
                      : "Sign in to upload files"
                    }
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    !isLoading && handleSend();
                  }
                }}
                placeholder="Ask about TCP flow control, routing algorithms, or any ELEC3120 topic..."
                className="flex-1 min-h-[80px] max-h-[400px] resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
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
