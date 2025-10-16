import { useState, useMemo, useRef } from "react";
import { Send, Lightbulb, BookOpen, MessageSquare, Loader2, Paperclip, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: string;
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
}

const ChatMode = () => {
  const { toast } = useToast();
  const sessionId = useMemo(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, []);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm LearningPacer, your AI teaching assistant for ELEC3120. I can answer questions about Computer Networks based on your course materials. What would you like to learn today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [newMessageId, setNewMessageId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validate files
    const maxSize = 20 * 1024 * 1024; // 20MB
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "text/plain"];

    const validFiles = files.filter((file) => {
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 20MB limit`,
          variant: "destructive",
        });
        return false;
      }
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} must be PDF, PNG, JPG, or TXT`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    setAttachments((prev) => [...prev, ...validFiles]);
    
    // Reset file input to allow re-uploading the same file
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
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "text/plain"];

    const validFiles = files.filter((file) => {
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 20MB limit`,
          variant: "destructive",
        });
        return false;
      }
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} must be PDF, PNG, JPG, or TXT`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    setAttachments((prev) => [...prev, ...validFiles]);
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const currentAttachments = [...attachments];

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input || "📎 Sent attachment(s)",
      attachments: currentAttachments.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type,
      })),
    };

    const userInput = input;
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setAttachments([]);
    setIsLoading(true);

    // Show loading message
    const loadingMessage: Message = {
      id: `loading_${Date.now()}`,
      role: "assistant",
      content: "I received your question and I'm processing it…",
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      // Upload attachments to Supabase Storage
      const uploadedUrls: string[] = [];

      for (const file of currentAttachments) {
        const fileName = `${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("chat-attachments")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast({
            title: "Upload failed",
            description: `Failed to upload ${file.name}`,
            variant: "destructive",
          });
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(uploadData.path);

        uploadedUrls.push(urlData.publicUrl);
      }

      // Send message with attachment URLs to n8n webhook
      const response = await fetch(
        "https://smellycat9286.app.n8n.cloud/webhook-test/4dfc1e83-8e12-47d7-9c62-ffe784259705",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: userInput,
            sessionId,
            attachments: uploadedUrls,
          }),
        },
      );

      const data = await response.json();

      // Remove loading message and add actual response
      setMessages((prev) => {
        const withoutLoading = prev.filter((msg) => msg.id !== loadingMessage.id);
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.output || "I received your question and I'm processing it.",
          source: data.source_document || data.source,
        };
        setNewMessageId(aiMessage.id);
        setTimeout(() => setNewMessageId(null), 400);
        return [...withoutLoading, aiMessage];
      });
    } catch (error) {
      console.error("Error calling n8n webhook:", error);

      // Remove loading message and add error message
      setMessages((prev) => {
        const withoutLoading = prev.filter((msg) => msg.id !== loadingMessage.id);
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "Hmm, I couldn't retrieve a course-specific answer right now. Please try rephrasing your question or check back later.",
        };
        setNewMessageId(errorMessage.id);
        setTimeout(() => setNewMessageId(null), 400);
        return [...withoutLoading, errorMessage];
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Chat Interface */}
      <Card className="lg:col-span-2 glass-card shadow-lg">
        <CardHeader className="border-b gradient-hero">
          <CardTitle className="flex items-center gap-2 text-white">
            <MessageSquare className={`w-5 h-5 ${isLoading ? "animate-pulse" : ""}`} />
            Ask Questions
          </CardTitle>
        </CardHeader>
        <CardContent 
          className={`p-0 relative transition-all ${
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
          <ScrollArea className="h-[500px] p-6">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} ${
                    message.id === newMessageId ? "animate-slide-up" : ""
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 transition-smooth ${
                      message.role === "user" ? "gradient-primary text-white shadow-glow" : "glass-card text-foreground"
                    }`}
                  >
                    {message.content === "I received your question and I'm processing it…" ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <p className="text-sm leading-relaxed animate-shimmer">Thinking...</p>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
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
                            {attachment.type.includes("pdf") && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                PDF
                              </Badge>
                            )}
                            {attachment.type.includes("image") && (
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
          </ScrollArea>
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    !isLoading && handleSend();
                  }
                }}
                placeholder="Ask about TCP flow control, routing algorithms, or any ELEC3120 topic..."
                className="flex-1 min-h-[192px] max-h-[400px] resize-none"
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

      {/* Hints & Resources */}
      <Card className="glass-card shadow-lg">
        <CardHeader className="border-b gradient-hero">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <Lightbulb className="w-5 h-5 text-accent animate-float" />
            Smart Hints
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 transition-smooth hover:bg-primary/10">
              <h4 className="font-semibold text-sm mb-1">Tiered Help System</h4>
              <p className="text-xs text-muted-foreground">Get hints from symptoms to complete solutions</p>
            </div>
            <div className="p-4 rounded-lg bg-accent/5 border border-accent/20 transition-smooth hover:bg-accent/10">
              <h4 className="font-semibold text-sm mb-1">Source Citations</h4>
              <p className="text-xs text-muted-foreground">Every answer references course materials</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary border transition-smooth hover:bg-secondary/80">
              <h4 className="font-semibold text-sm mb-1">Scope Protection</h4>
              <p className="text-xs text-muted-foreground">Only ELEC3120 topics - no hallucinations</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatMode;
