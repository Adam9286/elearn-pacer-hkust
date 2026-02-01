import { BookOpen, MessageSquare, Target, Brain, CheckCircle2, AlertTriangle, FileText, Sparkles, X } from "lucide-react";
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

  const totalLessons = chapters.reduce((acc, ch) => acc + ch.lessons.length, 0);
  const completedLessons = progress.reduce((acc, p) => acc + (p.lessons_completed?.length || 0), 0);
  const sectionsCompleted = chapters.filter((ch) => {
    const chProgress = progress.find((p) => p.chapter_id === ch.id);
    return chProgress && (chProgress.lessons_completed?.length || 0) >= ch.lessons.length;
  }).length;

  const getCurrentStep = () => {
    if (!user) return 0;
    if (sectionsCompleted === chapters.length) return 4;
    if (completedLessons >= Math.ceil(totalLessons * 0.5)) return 2;
    if (completedLessons >= 1) return 1;
    return 0;
  };

  const currentStep = getCurrentStep();

  const journeySteps = [
    { step: 1, title: "Ask Questions", description: "Use AI chat to explore any topic", icon: MessageSquare },
    { step: 2, title: "Master Units", description: `${completedLessons}/${totalLessons} lessons completed`, icon: BookOpen },
    { step: 3, title: "Practice Exams", description: "Test your knowledge with mock exams", icon: Target },
    { step: 4, title: "Ace ELEC3120", description: "You're ready for the final exam!", icon: Brain },
  ];

  // Note: Students can jump to any mode based on their needs - no strict order required

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
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-muted-foreground/20" />
          <motion.div
            className="absolute left-8 top-0 w-0.5 bg-gradient-to-b from-accent via-primary to-accent origin-top"
            initial={{ scaleY: 0 }}
            animate={inView ? { scaleY: currentStep / 4 } : { scaleY: 0 }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
            style={{ height: "100%" }}
          />
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
                        boxShadow: ["0 0 0 0 rgba(var(--primary), 0.4)", "0 0 0 10px rgba(var(--primary), 0)"]
                      } : {}}
                      transition={isCurrent ? { duration: 1.5, repeat: Infinity, ease: "easeOut" } : {}}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-accent-foreground" />
                      ) : (
                        <Icon className={`w-6 h-6 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                      )}
                    </motion.div>
                  </div>
                  <div className={`flex-1 pt-2 ${!isCompleted && !isCurrent ? "opacity-50" : ""}`}>
                    <div className="flex items-center gap-3">
                      <h4 className={`font-semibold text-lg ${isCompleted ? "text-accent" : isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                        {item.title}
                      </h4>
                      {isCompleted && <Badge variant="secondary" className="bg-accent/20 text-accent text-xs">Complete</Badge>}
                      {isCurrent && <Badge className="bg-primary/20 text-primary text-xs animate-pulse">Current</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
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

// ChatGPT vs LearningPacer Comparison
const ComparisonSection = () => {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="glass-card shadow-lg border-2 overflow-hidden">
        <CardHeader>
          <Badge className="w-fit mb-2 bg-destructive/10 text-destructive border-destructive/20">The Problem</Badge>
          <CardTitle className="text-2xl">ChatGPT vs LearningPacer</CardTitle>
          <CardDescription>Same question, very different answers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* ChatGPT Side */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="font-medium">ChatGPT</span>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
                <p className="text-sm font-medium text-foreground">"What is TCP congestion control?"</p>
                <p className="text-sm text-muted-foreground">
                  TCP congestion control is a mechanism that prevents network congestion by adjusting the transmission rate. 
                  It uses algorithms like slow start, congestion avoidance, fast retransmit, and fast recovery to maintain optimal throughput...
                </p>
                <div className="flex items-center gap-2 text-destructive text-xs pt-2 border-t border-border">
                  <X className="w-4 h-4" />
                  <span>Generic textbook answer. No citation. May not match ELEC3120 syllabus.</span>
                </div>
              </div>
            </div>

            {/* LearningPacer Side */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <span className="font-medium">LearningPacer</span>
              </div>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                <p className="text-sm font-medium text-foreground">"What is TCP congestion control?"</p>
                <p className="text-sm text-muted-foreground">
                  According to <span className="text-primary font-medium">Lecture 7 (slides 12-18)</span>, TCP uses AIMD: 
                  <span className="text-foreground"> Additive Increase</span> when ACKs are received continuously, 
                  <span className="text-foreground"> Multiplicative Decrease</span> when packet loss is detected via triple duplicate ACKs or timeout...
                </p>
                <div className="flex items-center gap-2 text-xs pt-2 border-t border-primary/20">
                  <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30 text-primary">
                    <FileText className="w-3 h-3 mr-1" />
                    07-Congestion_Control.pdf, slides 12-18
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-accent text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Matches exactly what Prof. Meng teaches. Cites the specific slide.</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Source Citation Proof
const SourceProofSection = () => {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });

  const exampleQuestions = [
    { q: "How does BGP path selection work?", source: "11-BGP.pdf" },
    { q: "What causes TCP head-of-line blocking?", source: "06-TCP.pdf" },
    { q: "Explain 802.11 CSMA/CA", source: "09-Wireless_LAN.pdf" },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className="glass-card shadow-lg border-2">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">Every Answer Cites Its Source</CardTitle>
              <CardDescription>Verify any answer against the actual lecture slides</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Unlike ChatGPT, every response tells you exactly which lecture PDF and slide numbers the information comes from. 
            You can verify the answer yourself—no more guessing if the AI made it up.
          </p>
          
          <div className="grid sm:grid-cols-3 gap-3">
            {exampleQuestions.map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-secondary/50 border border-border">
                <p className="text-sm font-medium mb-2 line-clamp-2">{item.q}</p>
                <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30 text-primary">
                  <FileText className="w-3 h-3 mr-1" />
                  {item.source}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Exam Practice Section
const ExamPracticeSection = () => {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="glass-card shadow-lg border-2">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center shadow-glow">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">Practice What You'll Be Tested On</CardTitle>
              <CardDescription>Generate mock exams from specific lectures you want to review</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">How it works:</h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  <span>Select specific topics like "Congestion Control" + "BGP" to focus on weak areas</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  <span>Questions based on how Prof. Meng actually teaches the concepts</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  <span>Export to PDF for offline practice before the exam</span>
                </li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
              <p className="text-sm font-medium mb-2">Example exam configuration:</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-accent/10 border-accent/30 text-accent">TCP Congestion</Badge>
                <Badge variant="outline" className="bg-accent/10 border-accent/30 text-accent">BGP Routing</Badge>
                <Badge variant="outline" className="bg-accent/10 border-accent/30 text-accent">802.11 MAC</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-3">→ Generates 15-20 questions from these 3 lectures</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Honest Limitations Section
const LimitationsSection = () => {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });

  const limitations = [
    "Grade your answers or tell you if you're correct",
    "Replace reading the lecture slides yourself",
    "Access content outside ELEC3120 (this is intentional—it keeps answers accurate)",
    "Guarantee exam questions (we help you prepare, not cheat)",
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="border-amber-500/30 bg-amber-500/5 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <CardTitle className="text-xl">What LearningPacer Cannot Do</CardTitle>
          </div>
          <CardDescription>We're honest about our limitations so you can trust our capabilities</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid sm:grid-cols-2 gap-3">
            {limitations.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                <X className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const HowItWorks = () => {
  return (
    <div className="space-y-8">
      {/* Student-Focused Header */}
      <div className="text-center space-y-4">
        <Badge className="gradient-primary text-white px-4 py-1">How It Works</Badge>
        <h2 className="text-4xl font-bold">
          Why LearningPacer{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Instead of ChatGPT?
          </span>
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          ChatGPT hallucinates. LearningPacer only answers from Prof. Meng's actual lecture slides, 
          lab manuals, and past exams. <span className="text-foreground font-medium">Every answer cites its source.</span>
        </p>
      </div>

      {/* ChatGPT vs LearningPacer Comparison */}
      <ComparisonSection />

      {/* Source Citation Proof */}
      <SourceProofSection />

      {/* Exam Practice */}
      <ExamPracticeSection />

      {/* Honest Limitations */}
      <LimitationsSection />

      {/* Learning Journey Timeline */}
      <LearningJourneyTimeline />
    </div>
  );
};

export default HowItWorks;
