import { useState, useMemo } from "react";
import { Send, Lightbulb, BookOpen, MessageSquare, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: string;
}

const ChatMode = () => {
  const sessionId = useMemo(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, []);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm LearningPacer, your AI teaching assistant for ELEC3120. I can answer questions about Computer Networks based on your course materials. What would you like to learn today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [newMessageId, setNewMessageId] = useState<string | null>(null);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    const userInput = input;
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Show loading message
    const loadingMessage: Message = {
      id: `loading_${Date.now()}`,
      role: "assistant",
      content: "I received your question and I'm processing it…",
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      const response = await fetch('https://smellycat9286.app.n8n.cloud/webhook-test/4dfc1e83-8e12-47d7-9c62-ffe784259705', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userInput,
          sessionId,
        }),
      });

      const data = await response.json();
      
      // Remove loading message and add actual response
      setMessages((prev) => {
        const withoutLoading = prev.filter(msg => msg.id !== loadingMessage.id);
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
      console.error('Error calling n8n webhook:', error);
      
      // Remove loading message and add error message
      setMessages((prev) => {
        const withoutLoading = prev.filter(msg => msg.id !== loadingMessage.id);
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Hmm, I couldn't retrieve a course-specific answer right now. Please try rephrasing your question or check back later.",
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
        <CardContent className="p-0">
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
                      message.role === "user"
                        ? "gradient-primary text-white shadow-glow"
                        : "glass-card text-foreground"
                    }`}
                  >
                    {message.content === "I received your question and I'm processing it…" ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <p className="text-sm leading-relaxed animate-shimmer">
                          Thinking...
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
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
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !isLoading && handleSend()}
                placeholder="Ask about TCP flow control, routing algorithms, or any ELEC3120 topic..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button 
                onClick={handleSend} 
                className="gradient-primary shadow-glow hover:animate-pulse-glow transition-smooth" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
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
              <p className="text-xs text-muted-foreground">
                Get hints from symptoms to complete solutions
              </p>
            </div>
            <div className="p-4 rounded-lg bg-accent/5 border border-accent/20 transition-smooth hover:bg-accent/10">
              <h4 className="font-semibold text-sm mb-1">Source Citations</h4>
              <p className="text-xs text-muted-foreground">
                Every answer references course materials
              </p>
            </div>
            <div className="p-4 rounded-lg bg-secondary border transition-smooth hover:bg-secondary/80">
              <h4 className="font-semibold text-sm mb-1">Scope Protection</h4>
              <p className="text-xs text-muted-foreground">
                Only ELEC3120 topics - no hallucinations
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatMode;
