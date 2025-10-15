import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Brain, Zap, Lock, Target } from "lucide-react";

const PlatformIntro = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.2,
  });

  const features = [
    { icon: Brain, text: "RAG Architecture prevents hallucinations" },
    { icon: Zap, text: "Real-time semantic search with vector embeddings" },
    { icon: Lock, text: "Source-cited answers from verified materials" },
    { icon: Target, text: "Adaptive learning paths tailored to you" },
  ];

  return (
    <section ref={ref} className="min-h-screen py-20 px-4 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-dark-void via-navy/20 to-dark-void"></div>
      
      <div className="container mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="glass-card p-8 rounded-2xl border border-electric-cyan/30 shadow-glow">
              {/* Mock chat interface */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-white/60 text-sm ml-2">LearningPacer Chat</span>
                </div>
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.3 }}
                  className="bg-primary/20 p-4 rounded-lg border-l-4 border-primary"
                >
                  <p className="text-white/90 text-sm">What is TCP congestion control?</p>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.6 }}
                  className="bg-accent/20 p-4 rounded-lg border-l-4 border-accent"
                >
                  <p className="text-white/90 text-sm">TCP congestion control manages network traffic...</p>
                  <div className="mt-2 text-xs text-white/50">
                    📚 Source: Unit 4, Slide 23
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={inView ? { opacity: 1 } : {}}
                  transition={{ delay: 0.9 }}
                  className="flex gap-2"
                >
                  <div className="h-2 w-2 bg-electric-cyan rounded-full animate-pulse"></div>
                  <div className="h-2 w-2 bg-electric-cyan rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="h-2 w-2 bg-electric-cyan rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </motion.div>
              </div>
            </div>

            {/* Floating code snippets */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute -top-4 -right-4 bg-dark-void/80 backdrop-blur-sm p-3 rounded-lg border border-neon-purple/30 text-xs text-neon-purple font-mono"
            >
              vector_search()
            </motion.div>
          </motion.div>

          {/* Right: Text content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-neon-blue to-electric-cyan bg-clip-text text-transparent">
              Powered by Retrieval-Augmented Generation
            </h2>
            
            <div className="space-y-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex items-start gap-4 group"
                >
                  <div className="p-3 rounded-lg bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 border border-electric-cyan/30 group-hover:scale-110 transition-smooth">
                    <feature.icon className="w-6 h-6 text-electric-cyan" />
                  </div>
                  <p className="text-white/80 text-lg pt-3">{feature.text}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 1 }}
              className="mt-8 p-6 glass-card rounded-xl border border-accent/30"
            >
              <p className="text-white/70 text-sm">
                <span className="text-accent font-semibold">Built for:</span> ELEC3120 Computer Networks at HKUST
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PlatformIntro;
