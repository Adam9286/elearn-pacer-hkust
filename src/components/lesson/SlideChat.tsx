// SlideChat - Context-aware study assistant for course mode
// Keeps conversation across slide changes within the same lesson
// Uses n8n chat workflow with slide context for RAG-based answers

import { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { WEBHOOKS, TIMEOUTS } from "@/constants/api";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface SlideChatProps {
  lessonId: string;
  lessonTitle: string;
  slideNumber: number;
  slideContext?: string; // Current slide explanation for context
  keyPoints?: string[]; // Current slide key points
  chapterTitle?: string;
  textbookSections?: string;
  lectureId?: string;
}

const SlideChat = ({
  lessonId,
  lessonTitle,
  slideNumber,
  slideContext,
  keyPoints,
  chapterTitle,
  textbookSections,
  lectureId
}: SlideChatProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(slideNumber);
  const [currentLessonId, setCurrentLessonId] = useState(lessonId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Expand when there are messages or user is typing
  const isExpanded = isFocused || messages.length > 0 || input.length > 0;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Reset chat when lesson changes (different lesson = fresh conversation)
  useEffect(() => {
    if (lessonId !== currentLessonId) {
      setMessages([]);
      setInput("");
      setCurrentLessonId(lessonId);
      setCurrentSlide(slideNumber);
    }
  }, [lessonId]);

  // Add divider when slide changes within the same lesson
  useEffect(() => {
    if (slideNumber !== currentSlide && lessonId === currentLessonId) {
      // Only add divider if there are existing messages
      if (messages.length > 0) {
        const divider: ChatMessage = {
          id: `divider-${Date.now()}`,
          role: 'system',
          content: `Now studying Page ${slideNumber}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, divider]);
      }
      setCurrentSlide(slideNumber);
    }
  }, [slideNumber]);

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedInput,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUTS.CHAT);

      const response = await fetch(WEBHOOKS.COURSE_SLIDE_CHAT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedInput,
          sessionId: `lesson-${lessonId}`,
          slideContext: {
            lessonId,
            lessonTitle,
            slideNumber,
            lectureId,
            chapterTitle,
            textbookSections,
            currentExplanation: slideContext?.slice(0, 1500),
            keyPoints: keyPoints?.slice(0, 5),
          },
          isSlideChat: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response || data.output || data.answer || data.message || "I couldn't generate a response. Please try again.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('[SlideChat] Error:', error);

      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: error instanceof Error && error.name === 'AbortError'
          ? "Request timed out. Please try again with a shorter question."
          : "Sorry, I couldn't process your question. Please try again.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Header with context badge */}
      <div className="px-3 pt-3 pb-1 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-medium">Ask your TA</span>
        <Badge variant="outline" className="text-xs ml-auto">
          <BookOpen className="h-3 w-3 mr-1" />
          Page {slideNumber}
        </Badge>
      </div>

      {/* Input area */}
      <div className="p-3 pt-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 150)}
              placeholder={`Ask about Page ${slideNumber}...`}
              className={cn(
                "resize-none transition-all",
                isExpanded ? "min-h-[60px]" : "min-h-[40px] py-2"
              )}
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className={cn(
              "shrink-0 transition-all",
              isExpanded ? "h-[60px] w-[44px]" : "h-[40px] w-[40px]"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Messages - shown when expanded */}
      {isExpanded && messages.length > 0 && (
        <div className="border-t">
          <ScrollArea className="h-56 p-3" ref={scrollRef}>
            <div className="space-y-3">
              {messages.map((msg) => {
                // Render system dividers differently
                if (msg.role === 'system') {
                  return (
                    <div key={msg.id} className="flex items-center gap-2 py-1">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground px-2">{msg.content}</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-3 py-2",
                        msg.role === 'user'
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default SlideChat;
