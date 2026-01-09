import { Brain, Lock, Target, BookOpen, MessageSquare, Zap, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserProgress } from "@/contexts/UserProgressContext";
import { chapters } from "@/data/courseContent";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

// Learning Journey Timeline Component
const LearningJourneyTimeline = () => {
  const { progress, loading, user } = useUserProgress();
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });

  // Calculate progress metrics
  const totalLessons = chapters.reduce((acc, ch) => acc + ch.lessons.length, 0);
  const completedLessons = progress.reduce((acc, p) => acc + (p.lessons_completed?.length || 0), 0);
  const sectionsCompleted = chapters.filter((ch) => {
    const chProgress = progress.find((p) => p.chapter_id === ch.id);
    return chProgress && (chProgress.lessons_completed?.length || 0) >= ch.lessons.length;
  }).length;

  // Determine current step (0-3)
  const getCurrentStep = () => {
    if (!user) return 0;
    if (sectionsCompleted === chapters.length) return 4; // All done
    if (completedLessons >= Math.ceil(totalLessons * 0.5)) return 2; // Practice exams
    if (completedLessons >= 1) return 1; // Master units
    return 0; // Ask questions
  };

  const currentStep = getCurrentStep();

  const journeySteps = [
    { 
      step: 1, 
      title: "Ask Questions", 
      description: "Use AI chat to explore any topic",
      icon: MessageSquare 
    },
    { 
      step: 2, 
      title: "Master Units", 
      description: `${completedLessons}/${totalLessons} lessons completed`,
      icon: BookOpen 
    },
    { 
      step: 3, 
      title: "Practice Exams", 
      description: "Test your knowledge with mock exams",
      icon: Target 
    },
    { 
      step: 4, 
      title: "Ace ELEC3120", 
      description: "You're ready for the final exam!",
      icon: Brain 
    },
  ];

  return (
    <Card className="glass-card shadow-lg border-2 overflow-hidden">
      <CardHeader className="gradient-hero text-white">
        <CardTitle className="text-2xl">Your Learning Journey</CardTitle>
        <CardDescription className="text-white/80">
          {user ? `${Math.round((completedLessons / totalLessons) * 100)}% complete` : "Sign in to track your progress"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-8 pb-6" ref={ref}>
        <div className="relative">
          {/* Vertical Timeline Line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-muted-foreground/20" />
          
          {/* Animated Progress Line */}
          <motion.div
            className="absolute left-8 top-0 w-0.5 bg-gradient-to-b from-accent via-primary to-accent origin-top"
            initial={{ scaleY: 0 }}
            animate={inView ? { scaleY: currentStep / 4 } : { scaleY: 0 }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
            style={{ height: "100%" }}
          />

          {/* Timeline Steps */}
          <div className="space-y-8">
            {journeySteps.map((item, idx) => {
              const isCompleted = idx < currentStep;
              const isCurrent = idx === currentStep;
              const Icon = item.icon;

              return (
                <motion.div
                  key={idx}
                  className="relative flex items-start gap-6 pl-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                  transition={{ duration: 0.5, delay: 0.2 + idx * 0.15 }}
                >
                  {/* Node */}
                  <div className="relative z-10 flex-shrink-0">
                    <motion.div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                        isCompleted
                          ? "bg-accent border-accent shadow-[0_0_20px_rgba(var(--accent),0.5)]"
                          : isCurrent
                          ? "bg-primary/20 border-primary"
                          : "bg-muted border-muted-foreground/30"
                      }`}
                      animate={isCurrent ? { 
                        boxShadow: [
                          "0 0 0 0 rgba(var(--primary), 0.4)",
                          "0 0 0 10px rgba(var(--primary), 0)",
                        ]
                      } : {}}
                      transition={isCurrent ? { 
                        duration: 1.5, 
                        repeat: Infinity,
                        ease: "easeOut"
                      } : {}}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-accent-foreground" />
                      ) : (
                        <Icon className={`w-6 h-6 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                      )}
                    </motion.div>
                  </div>

                  {/* Content */}
                  <div className={`flex-1 pt-2 ${!isCompleted && !isCurrent ? "opacity-50" : ""}`}>
                    <div className="flex items-center gap-3">
                      <h4 className={`font-semibold text-lg ${isCompleted ? "text-accent" : isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                        {item.title}
                      </h4>
                      {isCompleted && (
                        <Badge variant="secondary" className="bg-accent/20 text-accent text-xs">
                          Complete
                        </Badge>
                      )}
                      {isCurrent && (
                        <Badge className="bg-primary/20 text-primary text-xs animate-pulse">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

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
      description: "Master each topic before advancing. Complete all lessons in each section to unlock the next level of content.",
      details: [
        "Structured progression through course topics",
        "Completion-based advancement",
        "Progress tracking across all sections",
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

      {/* Animated Learning Journey Timeline */}
      <LearningJourneyTimeline />
    </div>
  );
};

export default HowItWorks;
