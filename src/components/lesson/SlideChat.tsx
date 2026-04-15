// SlideChat - Context-aware study assistant for course mode
// Keeps conversation across slide changes within the same lesson

import { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { WEBHOOKS, TIMEOUTS } from "@/constants/api";
import { useAutosizeTextarea } from "@/hooks/useAutosizeTextarea";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface SlideChatProps {
  lessonId: string;
  lessonTitle: string;
  slideNumber: number;
  slideContext?: string;
  keyPoints?: string[];
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
  lectureId,
}: SlideChatProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(slideNumber);
  const [currentLessonId, setCurrentLessonId] = useState(lessonId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { resetHeight } = useAutosizeTextarea(inputRef, input, {
    minHeight: 48,
    maxHeight: 180,
  });

  const isExpanded = isFocused || messages.length > 0 || input.length > 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (lessonId !== currentLessonId) {
      setMessages([]);
      setInput("");
      resetHeight();
      setCurrentLessonId(lessonId);
      setCurrentSlide(slideNumber);
    }
  }, [lessonId, currentLessonId, slideNumber, resetHeight]);

  useEffect(() => {
    if (slideNumber !== currentSlide && lessonId === currentLessonId) {
      if (messages.length > 0) {
        const divider: ChatMessage = {
          id: `divider-${Date.now()}`,
          role: "system",
          content: `Now studying Slide ${slideNumber}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, divider]);
      }
      setCurrentSlide(slideNumber);
    }
  }, [slideNumber, currentSlide, lessonId, currentLessonId, messages.length]);

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmedInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    resetHeight();
    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUTS.CHAT);

      const response = await fetch(WEBHOOKS.COURSE_SLIDE_CHAT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          data.response ||
          data.output ||
          data.answer ||
          data.message ||
          "I couldn't generate a response. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("[SlideChat] Error:", error);

      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content:
          error instanceof Error && error.name === "AbortError"
            ? "Request timed out. Please try again with a shorter question."
            : "Sorry, I couldn't process your question. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <section className="rounded-[24px] border border-white/6 bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MessageSquare className="h-4 w-4 shrink-0 text-primary/80" />
            Ask the AI Tutor
          </div>
          <p className="text-sm text-muted-foreground">
            Ask about the slide you are currently reviewing.
          </p>
        </div>
        <Badge
          variant="outline"
          className="rounded-full border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-foreground/80"
        >
          <BookOpen className="mr-1 h-3 w-3" />
          Context: Slide {slideNumber}
        </Badge>
      </div>

      {isExpanded && messages.length > 0 && (
        <div ref={scrollRef} className="mb-4 max-h-56 space-y-3 overflow-y-auto pr-1">
          {messages.map((msg) => {
            if (msg.role === "system") {
              return (
                <div key={msg.id} className="flex items-center gap-2 py-1">
                  <div className="h-px flex-1 bg-white/8" />
                  <span className="px-2 text-xs text-muted-foreground">{msg.content}</span>
                  <div className="h-px flex-1 bg-white/8" />
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
                    msg.role === "user"
                      ? "border border-primary/20 bg-primary/10 text-foreground"
                      : "border border-white/6 bg-black/10 text-foreground/90"
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-white/6 bg-black/10 px-3 py-2.5 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-[22px] border border-white/8 bg-black/10 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          placeholder={`Ask a question about Slide ${slideNumber}...`}
          className={cn(
            "min-h-[48px] resize-none overflow-y-hidden border-0 bg-transparent px-2.5 py-2 text-sm leading-6 shadow-none transition-[height] duration-150 focus-visible:ring-0 focus-visible:ring-offset-0",
            isExpanded ? "min-h-[72px]" : "min-h-[48px]"
          )}
          disabled={isLoading}
        />

        <div className="flex items-center justify-between gap-3 border-t border-white/6 px-2.5 pt-2.5">
          <p className="text-xs text-muted-foreground">
            Your question will stay focused on Slide {slideNumber}.
          </p>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-10 rounded-xl bg-primary px-4 text-primary-foreground shadow-[0_12px_24px_rgba(0,0,0,0.2)] hover:bg-primary/90"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span className="hidden sm:inline">Send</span>
                <Send className="h-4 w-4 sm:ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default SlideChat;
