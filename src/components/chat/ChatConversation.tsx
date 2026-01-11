import { useState, useRef, useEffect } from 'react';
import { Send, Lightbulb, BookOpen, MessageSquare, Loader2, Paperclip, X, LogIn } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AIThinkingIndicator } from '@/components/AIThinkingIndicator';
import { RenderMath } from '@/components/RenderMath';
import { ChatMessage } from '@/hooks/useChatHistory';
import { Link } from 'react-router-dom';

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: string;
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
  onSendMessage,
}: ChatConversationProps) => {
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [newMessageId, setNewMessageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Local messages for non-authenticated users or during loading
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([WELCOME_MESSAGE]);

  // Combine database messages with welcome message
  const displayMessages: LocalMessage[] = isAuthenticated && messages.length > 0
    ? messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        source: m.source,
        attachments: m.attachments,
      }))
    : localMessages;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [displayMessages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 20 * 1024 * 1024;
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'text/plain'];

    const validFiles = files.filter((file) => {
      if (file.size > maxSize) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds 20MB limit`,
          variant: 'destructive',
        });
        return false;
      }
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: `${file.name} must be PDF, PNG, JPG, or TXT`,
          variant: 'destructive',
        });
        return false;
      }
      return true;
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
    const maxSize = 20 * 1024 * 1024;
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'text/plain'];

    const validFiles = files.filter((file) => {
      if (file.size > maxSize) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds 20MB limit`,
          variant: 'destructive',
        });
        return false;
      }
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: `${file.name} must be PDF, PNG, JPG, or TXT`,
          variant: 'destructive',
        });
        return false;
      }
      return true;
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

    const maxSize = 20 * 1024 * 1024;
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];

    const validFiles = imageFiles.filter((file) => {
      if (file.size > maxSize) {
        toast({
          title: 'Image too large',
          description: 'Pasted image exceeds 20MB limit',
          variant: 'destructive',
        });
        return false;
      }
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Unsupported image format',
          description: 'Only PNG and JPG images are supported',
          variant: 'destructive',
        });
        return false;
      }
      return true;
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
      setLoadingProgress(0);
      setLoadingStage('Uploading files');
      setEstimatedTime(15);

      const loadingMessage: LocalMessage = {
        id: `loading_${Date.now()}`,
        role: 'assistant',
        content: "I received your question and I'm processing it…",
      };
      setLocalMessages((prev) => [...prev, loadingMessage]);

      try {
        // Upload attachments to Supabase Storage (Lovable Cloud)
        const uploadedUrls: string[] = [];

        for (const file of currentAttachments) {
          const fileName = `${Date.now()}_${file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('chat-attachments')
            .upload(fileName, file, {
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

          const { data: urlData } = supabase.storage.from('chat-attachments').getPublicUrl(uploadData.path);
          uploadedUrls.push(urlData.publicUrl);
        }

        setLoadingProgress(20);
        setLoadingStage('Understanding question');
        setEstimatedTime(12);

        await new Promise((resolve) => setTimeout(resolve, 1500));
        setLoadingProgress(40);
        setLoadingStage('Searching course materials');
        setEstimatedTime(10);

        const response = await fetch(
          'https://smellycat9286.app.n8n.cloud/webhook-test/638fa33f-5871-43b3-a34e-d318a2147001',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: userInput,
              sessionId: `session_${Date.now()}`,
              attachments: uploadedUrls,
            }),
          }
        );

        setLoadingProgress(70);
        setLoadingStage('Generating response');
        setEstimatedTime(5);

        const data = await response.json();

        setLoadingProgress(90);
        setLoadingStage('Finalizing answer');
        setEstimatedTime(2);

        await new Promise((resolve) => setTimeout(resolve, 500));

        const payload = data.body ?? data;
        const output = payload.output ?? "I received your question and I'm processing it.";
        const source = payload.source_document ?? payload.source;

        setLocalMessages((prev) => {
          const withoutLoading = prev.filter((msg) => msg.id !== loadingMessage.id);
          const aiMessage: LocalMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: output,
            source: source,
          };
          setNewMessageId(aiMessage.id);
          setTimeout(() => setNewMessageId(null), 400);
          return [...withoutLoading, aiMessage];
        });
      } catch (error) {
        console.error('Error calling n8n webhook:', error);
        setLocalMessages((prev) => {
          const withoutLoading = prev.filter((msg) => msg.id !== loadingMessage.id);
          const errorMessage: LocalMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content:
              "Hmm, I couldn't retrieve a course-specific answer right now. Please try rephrasing your question or check back later.",
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
      {/* Smart Hints */}
      <Card className="glass-card shadow-lg mx-4 mt-4">
        <CardHeader className="border-b bg-gradient-to-r from-primary/80 to-accent/70 py-3">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <Lightbulb className="w-5 h-5 text-accent animate-float" />
            Smart Hints
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 transition-smooth hover:bg-primary/10">
              <h4 className="font-semibold text-sm mb-1 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4" />
                Tiered Help System
              </h4>
              <p className="text-xs text-muted-foreground">Get hints from symptoms to complete solutions</p>
            </div>
            <div className="p-3 rounded-lg bg-accent/5 border border-accent/20 transition-smooth hover:bg-accent/10">
              <h4 className="font-semibold text-sm mb-1 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                Source Citations
              </h4>
              <p className="text-xs text-muted-foreground">Every answer references course materials</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary border transition-smooth hover:bg-secondary/80">
              <h4 className="font-semibold text-sm mb-1 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" />
                Scope Protection
              </h4>
              <p className="text-xs text-muted-foreground">Only ELEC3120 topics - no hallucinations</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                        <AIThinkingIndicator
                          progress={loadingProgress}
                          stage={loadingStage}
                          estimatedTime={estimatedTime}
                        />
                      ) : (
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          <RenderMath text={message.content} />
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
                      {message.source && (
                        <Badge variant="outline" className="mt-2 text-xs animate-sparkle">
                          <BookOpen className="w-3 h-3 mr-1" />
                          {message.source}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t bg-background/50">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
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
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="shrink-0"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
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
