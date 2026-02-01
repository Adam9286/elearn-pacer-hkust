import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { MessageSquare, BookOpen, FileText, CheckCircle2, Lock, TrendingUp, Sparkles, ArrowRight } from "lucide-react";
import TiltCard from "./TiltCard";

const ModesShowcase = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const modes = [
    {
      icon: MessageSquare,
      title: "Chat Mode",
      description: "Ask anything about the course, get answers from Prof. Meng's slides",
      features: [
        "Ask in plain English",
        "Every answer shows which slide it's from",
        "Understands follow-up questions",
        "Answers in seconds, not hours"
      ],
      gradient: "from-neon-blue to-electric-cyan",
      mockup: (
        <div className="space-y-3 p-2">
          <motion.div
            className="flex gap-3"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-blue to-electric-cyan flex items-center justify-center text-white text-xs font-bold">AI</div>
            <div className="flex-1 bg-white/10 rounded-2xl rounded-tl-sm p-3 text-sm text-white/80">
              How can I explain TCP handshake?
            </div>
          </motion.div>
          <motion.div
            className="flex gap-3 justify-end"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="bg-neon-purple/30 rounded-2xl rounded-tr-sm p-3 text-sm text-white/80">
              What's SYN-ACK?
            </div>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">You</div>
          </motion.div>
        </div>
      )
    },
    {
      icon: BookOpen,
      title: "Course Mode",
      description: "Learn at your own pace with guided explanations",
      features: [
        "AI explains each slide in plain English",
        "Test yourself with quick checks",
        "Track which topics you've mastered",
        "Skip ahead when you're ready"
      ],
      gradient: "from-neon-purple to-cyber-pink",
      mockup: (
        <div className="space-y-3 p-2">
          {["OSI Model Basics", "TCP/IP Protocol", "Network Security"].map((lesson, i) => (
            <motion.div
              key={lesson}
              className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" }}
            >
              <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-green-500 text-white" : i === 1 ? "bg-neon-purple text-white" : "bg-white/10 text-white/40"}`}>
                {i === 0 ? "✓" : i === 1 ? i + 1 : <Lock className="w-3 h-3" />}
              </div>
              <span className="text-sm text-white/80 flex-1">{lesson}</span>
              <ArrowRight className="w-4 h-4 text-white/30" />
            </motion.div>
          ))}
        </div>
      )
    },
    {
      icon: FileText,
      title: "Mock Exam Mode",
      description: "Generate practice exams from specific lectures you choose",
      features: [
        "Pick topics you want to review",
        "Questions match Prof. Meng's teaching style",
        "Download as PDF for offline practice",
        "MCQ and open-ended formats"
      ],
      gradient: "from-electric-cyan to-neon-blue",
      mockup: (
        <div className="p-2 space-y-3">
          <motion.div
            className="text-sm text-white/80"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Q: Which layer handles end-to-end delivery?
          </motion.div>
          <div className="space-y-2">
            {["Physical", "Transport", "Network", "Application"].map((opt, i) => (
              <motion.div
                key={opt}
                className={`p-2 rounded-lg text-sm ${i === 1 ? "bg-green-500/20 border border-green-500/50 text-green-400" : "bg-white/5 border border-white/10 text-white/60"}`}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                {String.fromCharCode(65 + i)}. {opt}
              </motion.div>
            ))}
          </div>
        </div>
      )
    }
  ];

  return (
    <section ref={ref} className="min-h-screen py-20 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-dark-void via-navy/10 to-dark-void"></div>
      
      {/* Floating orbs */}
      <motion.div
        className="absolute top-20 left-10 w-72 h-72 rounded-full bg-neon-blue/10 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-electric-cyan/10 blur-3xl"
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity }}
      />
      
      <div className="container mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={inView ? { scale: 1 } : {}}
            transition={{ duration: 0.5, type: "spring" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-purple/10 border border-neon-purple/20 mb-6"
          >
            <Sparkles className="w-4 h-4 text-neon-purple" />
            <span className="text-sm text-white/80">Three Powerful Modes</span>
          </motion.div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-white">Three Modes, </span>
            <span className="bg-gradient-to-r from-neon-blue via-neon-purple to-electric-cyan bg-clip-text text-transparent">
              One Goal
            </span>
          </h2>
          <p className="text-white/60 text-lg">Master ELEC3120 your way</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {modes.map((mode, index) => (
            <motion.div
              key={mode.title}
              initial={{ opacity: 0, y: 50 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.15 }}
            >
              <TiltCard
                className="h-full"
                tiltStrength={8}
                glareEnabled={true}
              >
                <div className="h-full p-6 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 backdrop-blur-sm hover:border-white/20 transition-colors group">
                  {/* Gradient glow */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${mode.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-all duration-300 blur-xl -z-10`}></div>
                  
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${mode.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                    <mode.icon className="w-7 h-7 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-white mb-2">{mode.title}</h3>
                  <p className="text-white/60 text-sm mb-5">{mode.description}</p>

                  {/* Mockup preview */}
                  <div className="bg-dark-void/50 rounded-xl border border-white/10 mb-5 min-h-[140px] overflow-hidden">
                    {mode.mockup}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2">
                    {mode.features.map((feature, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={inView ? { opacity: 1, x: 0 } : {}}
                        transition={{ delay: 0.5 + index * 0.1 + i * 0.05 }}
                        className="flex items-center gap-2 text-white/50 text-sm"
                      >
                        <CheckCircle2 className="w-4 h-4 text-electric-cyan flex-shrink-0" />
                        <span>{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ModesShowcase;
