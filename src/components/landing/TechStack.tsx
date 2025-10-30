import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Brain, Workflow, Palette, Shield, Database, Cpu, Network, Code2 } from "lucide-react";

const TechStack = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const techCategories = [
    {
      icon: Brain,
      title: "RAG Architecture",
      items: [
        "Supabase pgvector for embeddings",
        "Semantic similarity search",
        "Source citation engine",
        "Context-aware retrieval",
      ],
      color: "neon-blue",
    },
    {
      icon: Workflow,
      title: "Backend Orchestration",
      items: ["n8n workflow automation", "Webhook integration", "Session management", "API orchestration"],
      color: "neon-purple",
    },
    {
      icon: Palette,
      title: "Frontend Excellence",
      items: ["React + TypeScript", "Tailwind CSS + Glassmorphism", "Framer Motion animations", "Responsive design"],
      color: "electric-cyan",
    },
    {
      icon: Shield,
      title: "Security & Privacy",
      items: ["Scope protection", "Rate limiting", "Secure API endpoints", "Data encryption"],
      color: "cyber-pink",
    },
  ];

  const architectureSteps = [
    { label: "User Query", icon: Code2 },
    { label: "n8n Webhook", icon: Workflow },
    { label: "RAG Pipeline", icon: Brain },
    { label: "Supabase", icon: Database },
    { label: "LLM", icon: Cpu },
    { label: "Response", icon: Network },
  ];

  return (
    <section ref={ref} className="min-h-screen py-20 px-4 relative overflow-hidden">
      {/* Server Room Ambiance Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-dark-void via-navy/20 to-dark-void"></div>

      {/* Vertical LED Strips */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`led-${i}`}
          className="absolute top-0 bottom-0 w-1"
          style={{
            left: `${i * 12.5}%`,
            background: `linear-gradient(180deg, 
              transparent 0%, 
              hsl(var(--${i % 2 === 0 ? 'electric-cyan' : 'neon-blue'}) / 0.4) 50%, 
              transparent 100%)`
          }}
          animate={{
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 2 + i * 0.3,
            repeat: Infinity,
            delay: i * 0.2
          }}
        />
      ))}

      {/* Server Rack Silhouettes */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        {[...Array(4)].map((_, i) => (
          <div
            key={`rack-${i}`}
            className="absolute bottom-0 w-16 h-64 border-l border-r border-electric-cyan/30"
            style={{ left: `${i * 25 + 5}%` }}
          >
            {/* Blinking indicator lights */}
            {[...Array(8)].map((_, j) => (
              <motion.div
                key={j}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  left: "50%",
                  top: `${j * 12 + 5}%`,
                  backgroundColor: j % 2 === 0 ? "hsl(var(--neon-green))" : "hsl(var(--electric-cyan))"
                }}
                animate={{
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1.5,
                  delay: j * 0.2 + i * 0.5,
                  repeat: Infinity
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Heat Distortion Effect */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-32 opacity-30"
        style={{
          background: "linear-gradient(0deg, hsl(var(--neon-orange) / 0.2) 0%, transparent 100%)",
          filter: "blur(20px)"
        }}
        animate={{
          scaleY: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Cable Management Lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="cableGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--electric-cyan))" stopOpacity="0.2" />
            <stop offset="50%" stopColor="hsl(var(--neon-blue))" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(var(--neon-purple))" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        {[...Array(6)].map((_, i) => (
          <motion.path
            key={i}
            d={`M ${i * 16}% 20% Q ${i * 16 + 8}% ${40 + i * 10}%, ${(i + 1) * 16}% 80%`}
            stroke="url(#cableGradient)"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3, delay: i * 0.3, repeat: Infinity, repeatType: "reverse" }}
          />
        ))}
      </svg>

      {/* Electron Flow Animation on Architecture */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`electron-${i}`}
            className="absolute w-2 h-2 rounded-full bg-electric-cyan glow-cyan"
            style={{
              left: `${10 + i * 15}%`,
              top: "50%"
            }}
            animate={{
              x: ["0%", "100%"],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 4,
              delay: i * 0.6,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
      </div>

      <div className="container mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-neon-purple to-white bg-clip-text text-transparent">
            Built with Cutting-Edge Technology
          </h2>
          <p className="text-white text-xl font-semibold">A technical deep dive into our architecture</p>
        </motion.div>

        {/* Architecture Flow */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-16"
        >
          <div className="glass-card-landing p-8 rounded-2xl border border-white/20 hover:border-white/40 transition-smooth">
            <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
              <Brain className="w-8 h-8 text-neon-blue" />
              Technical Architecture
            </h3>

            <div className="flex flex-wrap items-center justify-center gap-4">
              {architectureSteps.map((step, index) => (
                <div key={index} className="flex items-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={inView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 border border-electric-cyan/30 flex items-center justify-center group-hover:scale-110 transition-smooth">
                      <step.icon className="w-8 h-8 text-electric-cyan" />
                    </div>
                    <span className="text-white/85 text-sm text-center font-medium">{step.label}</span>
                  </motion.div>

                  {index < architectureSteps.length - 1 && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={inView ? { scaleX: 1 } : {}}
                      transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
                      className="mx-4 hidden md:block"
                    >
                      <div className="w-12 h-0.5 bg-gradient-to-r from-electric-cyan to-neon-purple"></div>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tech Categories Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {techCategories.map((category, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
              className="glass-card-landing p-6 rounded-xl border border-white/20 hover:border-white/40 transition-smooth group relative overflow-hidden"
            >
              {/* LCD Screen Scanlines */}
              <div className="absolute inset-0 pointer-events-none opacity-20">
                {[...Array(10)].map((_, i) => (
                  <div
                    key={i}
                    className="w-full h-px bg-electric-cyan/30"
                    style={{ top: `${i * 10}%` }}
                  />
                ))}
              </div>
              <div
                className={`w-12 h-12 rounded-lg bg-${category.color}/20 border border-${category.color}/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-smooth`}
              >
                <category.icon className={`w-6 h-6 text-${category.color}`} />
              </div>

              <h3 className="text-xl font-bold text-white mb-4">{category.title}</h3>

              <ul className="space-y-2">
                {category.items.map((item, i) => (
                  <li key={i} className="text-white/90 text-sm flex items-start gap-2">
                    <span className="text-electric-cyan mt-1 text-base">▹</span>
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Code snippet showcase */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-12 glass-card-landing p-6 rounded-xl border border-white/20"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <span className="text-white/60 text-sm font-mono">rag_pipeline.py</span>
          </div>

          <pre className="text-electric-cyan font-mono text-sm overflow-x-auto">
            <code>{`# Semantic similarity search
vector_results = supabase
  .rpc('match_documents', {
    'query_embedding': embedding,
    'match_threshold': 0.78,
    'match_count': 5
  })
  .execute()`}</code>
          </pre>
        </motion.div>
      </div>
    </section>
  );
};

export default TechStack;
