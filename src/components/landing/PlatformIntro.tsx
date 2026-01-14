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
    { icon: Target, text: "Gated learning paths for structured progression" },
  ];

  return (
    <section ref={ref} className="min-h-screen py-20 px-4 relative overflow-hidden">
      {/* Network Topology Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-dark-void via-navy/20 to-dark-void"></div>
      
      {/* Animated Network Topology */}
      <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--electric-cyan))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--neon-blue))" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        {/* Network connections */}
        {[...Array(8)].map((_, i) => (
          <motion.line
            key={i}
            x1={`${(i % 4) * 25 + 10}%`}
            y1={`${Math.floor(i / 4) * 50 + 20}%`}
            x2={`${((i + 1) % 4) * 25 + 10}%`}
            y2={`${Math.floor((i + 1) / 4) * 50 + 20}%`}
            stroke="url(#lineGradient)"
            strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 2, delay: i * 0.2, repeat: Infinity, repeatType: "reverse" }}
          />
        ))}
        {/* Network nodes */}
        {[...Array(12)].map((_, i) => (
          <motion.circle
            key={`node-${i}`}
            cx={`${(i % 4) * 25 + 10}%`}
            cy={`${Math.floor(i / 4) * 33 + 15}%`}
            r="4"
            fill="hsl(var(--electric-cyan))"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 3, delay: i * 0.3, repeat: Infinity }}
          />
        ))}
      </svg>

      {/* Hexagonal Grid */}
      <div className="absolute inset-0 opacity-20">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-32 h-32 border border-neon-blue/30"
            style={{
              left: `${(i % 3) * 33}%`,
              top: `${Math.floor(i / 3) * 50}%`,
              clipPath: "polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)",
            }}
            animate={{ 
              opacity: [0.2, 0.6, 0.2],
              borderColor: ["hsl(var(--neon-blue) / 0.3)", "hsl(var(--electric-cyan) / 0.6)", "hsl(var(--neon-blue) / 0.3)"]
            }}
            transition={{ duration: 4, delay: i * 0.5, repeat: Infinity }}
          />
        ))}
      </div>

      {/* Vertical Data Streams */}
      <div className="absolute left-0 top-0 bottom-0 w-full overflow-hidden opacity-10">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-full w-px bg-gradient-to-b from-transparent via-electric-cyan to-transparent"
            style={{ left: `${i * 20 + 10}%` }}
            animate={{ y: ["-100%", "100%"] }}
            transition={{ duration: 8, delay: i * 0.5, repeat: Infinity, ease: "linear" }}
          />
        ))}
      </div>

      {/* Scanline Effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-electric-cyan/10 to-transparent h-20"
        animate={{ y: ["-20%", "120%"] }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />
      
      <div className="container mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="glass-card-landing p-8 rounded-2xl border border-white/20 hover:border-white/40 transition-smooth shadow-glow">
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
                  <div className="mt-2 text-xs text-white/60">
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
                  <p className="text-white text-lg pt-3 font-medium">{feature.text}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 1 }}
              className="mt-8 p-6 glass-card-landing rounded-xl border border-white/20 bg-gradient-to-r from-accent/10 to-neon-blue/10"
            >
              <p className="text-white text-base">
                <span className="text-accent font-bold">Built for:</span>{" "}
                <span className="font-semibold">ELEC3120 Computer Networks at HKUST</span>
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PlatformIntro;
