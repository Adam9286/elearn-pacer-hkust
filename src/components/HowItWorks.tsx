import { Brain, Lock, Target, BookOpen, MessageSquare, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const HowItWorks = () => {
  const features = [
    {
      icon: MessageSquare,
      title: "RAG-Based Q&A",
      description: "Ask questions and get accurate answers sourced directly from ELEC3120 course materials - lecture slides, lab manuals, and past exams.",
      details: [
        "Vector database stores all course content",
        "Semantic search finds most relevant information",
        "Every answer cites its source document",
        "Scope protection prevents hallucinations",
      ],
      color: "primary",
    },
    {
      icon: Lock,
      title: "Gated Learning Paths",
      description: "Master each topic before advancing. Achieve 80% mastery in each unit to unlock the next level of content.",
      details: [
        "Structured progression through course topics",
        "Mastery-based advancement (80% threshold)",
        "Progress tracking across all units",
        "Review completed units anytime",
      ],
      color: "accent",
    },
    {
      icon: Target,
      title: "Adaptive Mock Exams",
      description: "Practice tests that adapt to your weak areas, providing focused preparation where you need it most.",
      details: [
        "Questions weighted by your performance",
        "Immediate feedback on all answers",
        "Detailed explanations for learning",
        "Track improvement over time",
      ],
      color: "primary",
    },
  ];

  const techStack = [
    { name: "RAG Architecture", detail: "Retrieval-Augmented Generation prevents AI hallucinations" },
    { name: "Vector Search", detail: "Supabase pgvector for semantic course material retrieval" },
    { name: "Adaptive Learning", detail: "Dynamic difficulty adjustment based on performance" },
    { name: "n8n Integration", detail: "Seamless workflow automation for AI responses" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <Badge className="gradient-primary text-white px-4 py-1">How It Works</Badge>
        <h2 className="text-4xl font-bold">
          Three Modes, One Goal:{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Master ELEC3120
          </span>
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          LearningPacer combines cutting-edge AI with proven educational techniques to help you excel in Computer Networks
        </p>
      </div>

      {/* Main Features */}
      <div className="grid md:grid-cols-3 gap-6">
        {features.map((feature, idx) => (
          <Card key={idx} className="glass-card shadow-lg transition-smooth hover:shadow-glow border-2">
            <CardHeader>
              <div
                className={`w-14 h-14 rounded-xl ${
                  feature.color === "primary" ? "gradient-primary" : "gradient-accent"
                } flex items-center justify-center mb-4 shadow-glow`}
              >
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <CardTitle className="text-xl">{feature.title}</CardTitle>
              <CardDescription className="text-base">{feature.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {feature.details.map((detail, detailIdx) => (
                  <li key={detailIdx} className="flex items-start gap-2 text-sm">
                    <Zap className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Technical Deep Dive */}
      <Card className="glass-card shadow-lg border-2">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-6 h-6 text-primary" />
            <CardTitle className="text-2xl">Technical Architecture</CardTitle>
          </div>
          <CardDescription>
            Built on proven AI technologies to ensure accuracy, security, and scalability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {techStack.map((tech, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg bg-secondary/50 border border-primary/10 transition-smooth hover:bg-secondary"
              >
                <h4 className="font-semibold mb-1 text-primary">{tech.name}</h4>
                <p className="text-sm text-muted-foreground">{tech.detail}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Learning Flow */}
      <Card className="glass-card shadow-lg border-2 gradient-hero text-white">
        <CardHeader>
          <CardTitle className="text-2xl">Your Learning Journey</CardTitle>
          <CardDescription className="text-white/80">
            From beginner to expert in Computer Networks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {[
              { step: "1", text: "Ask Questions", icon: MessageSquare },
              { step: "2", text: "Master Units", icon: BookOpen },
              { step: "3", text: "Practice Exams", icon: Target },
              { step: "4", text: "Ace ELEC3120", icon: Brain },
            ].map((item, idx) => (
              <div key={idx} className="flex-1 min-w-[140px]">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm mx-auto flex items-center justify-center border-2 border-accent">
                    <item.icon className="w-7 h-7 text-accent" />
                  </div>
                  <div className="text-3xl font-bold text-accent">{item.step}</div>
                  <p className="text-sm font-medium">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HowItWorks;
