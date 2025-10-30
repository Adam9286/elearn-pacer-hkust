import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { MessageSquare, BookOpen, FileText, CheckCircle2, Lock, TrendingUp, Sparkles } from "lucide-react";

const ModesShowcase = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const modes = [
    {
      icon: MessageSquare,
      title: "Chat Mode",
      description: "Ask questions, get instant RAG-powered answers",
      features: [
        "Natural language Q&A",
        "Source citations included",
        "Context-aware responses",
        "Real-time interaction"
      ],
      gradient: "from-neon-blue to-electric-cyan",
      mockup: (
        <div className="space-y-2">
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex gap-2 items-center text-white/80"
          >
            <div className="w-2 h-2 bg-neon-blue rounded-full"></div>
            <span className="text-sm">AI is typing...</span>
          </motion.div>
        </div>
      )
    },
    {
      icon: BookOpen,
      title: "Course Mode",
      description: "Master concepts with gated learning paths",
      features: [
        "Sequential unit unlocking",
        "Progress tracking",
        "Mastery-based advancement",
        "Personalized pacing"
      ],
      gradient: "from-neon-purple to-cyber-pink",
      mockup: (
        <div className="space-y-2">
          <motion.div
            initial={{ width: "0%" }}
            animate={inView ? { width: "75%" } : {}}
            transition={{ duration: 2, delay: 0.5 }}
            className="h-3 bg-gradient-to-r from-neon-purple to-cyber-pink rounded-full"
          />
          <div className="flex gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <Lock className="w-4 h-4 text-white/30" />
          </div>
        </div>
      )
    },
    {
      icon: FileText,
      title: "Mock Exam Mode",
      description: "Practice with adaptive difficulty testing",
      features: [
        "Real exam simulation",
        "Adaptive difficulty",
        "Detailed analytics",
        "Performance insights"
      ],
      gradient: "from-electric-cyan to-neon-blue",
      mockup: (
        <div className="space-y-2">
          <motion.div
            animate={{ rotate: [0, 180, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-electric-cyan border-t-transparent rounded-full mx-auto"
          />
          <div className="text-center text-white/80 text-sm">
            <TrendingUp className="w-4 h-4 inline mr-1" />
            Analyzing performance...
          </div>
        </div>
      )
    }
  ];

  return (
    <section ref={ref} className="min-h-screen py-20 px-4 relative overflow-hidden">
      {/* Spotlight Theatre Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-dark-void via-navy/10 to-dark-void"></div>
      
      {/* Animated Spotlight Beams */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={`spotlight-${i}`}
          className="absolute top-0 w-64 h-full opacity-20"
          style={{
            left: `${i * 33}%`,
            background: `linear-gradient(180deg, 
              hsl(var(--${i === 0 ? 'neon-blue' : i === 1 ? 'neon-purple' : 'electric-cyan'}) / 0.3) 0%, 
              transparent 50%)`,
            transformOrigin: "top center",
          }}
          animate={{
            scaleX: [1, 1.5, 1],
            opacity: [0.1, 0.3, 0.1],
            rotate: [-5, 5, -5]
          }}
          transition={{
            duration: 6,
            delay: i * 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}

      {/* Floating Geometric Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => {
          const shapes = ['circle', 'triangle', 'hexagon'];
          const shape = shapes[i % 3];
          return (
            <motion.div
              key={`shape-${i}`}
              className="absolute blur-sm"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -100, 0],
                x: [0, Math.random() * 50 - 25, 0],
                opacity: [0, 0.3, 0],
                rotate: [0, 360]
              }}
              transition={{
                duration: 10 + i * 2,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              {shape === 'circle' && (
                <div className="w-8 h-8 rounded-full border-2 border-neon-blue/40" />
              )}
              {shape === 'triangle' && (
                <div className="w-8 h-8 border-2 border-neon-purple/40" 
                     style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }} />
              )}
              {shape === 'hexagon' && (
                <div className="w-8 h-8 border-2 border-electric-cyan/40"
                     style={{ clipPath: "polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)" }} />
              )}
            </motion.div>
          );
        })}
      </div>
      
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
            className="inline-block mb-6"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-neon-blue via-neon-purple to-electric-cyan flex items-center justify-center shadow-glow mx-auto">
              <Sparkles className="w-10 h-10 text-white animate-sparkle" />
            </div>
          </motion.div>
          
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-neon-blue to-white bg-clip-text text-transparent">
            Three Modes, One Goal
          </h2>
          <p className="text-white text-2xl font-semibold">Master ELEC3120 your way</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {modes.map((mode, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              whileHover={{ y: -10, transition: { duration: 0.3 } }}
              className="group relative"
            >
              <div className="glass-card-landing p-8 rounded-2xl border border-white/20 hover:border-white/40 transition-smooth h-full">
                {/* Gradient glow on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${mode.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-smooth blur-xl`}></div>
                
                {/* Colored Shadow Effect */}
                <div className={`absolute -inset-1 bg-gradient-to-br ${mode.gradient} opacity-0 group-hover:opacity-20 rounded-2xl blur-2xl -z-10 transition-smooth`}></div>
                
                {/* Orbiting Particles */}
                <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className={`absolute w-2 h-2 rounded-full bg-gradient-to-br ${mode.gradient}`}
                      style={{
                        left: "50%",
                        top: "50%",
                      }}
                      animate={{
                        x: [0, 100 * Math.cos((i * 120 * Math.PI) / 180), 0],
                        y: [0, 100 * Math.sin((i * 120 * Math.PI) / 180), 0],
                        opacity: [0, 0.6, 0],
                      }}
                      transition={{
                        duration: 4,
                        delay: i * 0.5,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    />
                  ))}
                </div>
                
                <div className="relative z-10">
                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${mode.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-smooth shadow-glow`}>
                    <mode.icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold text-white mb-3">{mode.title}</h3>
                  <p className="text-white text-base mb-6">{mode.description}</p>

                  {/* Mockup preview */}
                  <div className="bg-dark-void/50 p-4 rounded-lg mb-6 min-h-[100px] flex items-center justify-center">
                    {mode.mockup}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3">
                    {mode.features.map((feature, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={inView ? { opacity: 1, x: 0 } : {}}
                        transition={{ delay: index * 0.2 + i * 0.1 }}
                        className="flex items-center gap-3 text-white text-sm"
                      >
                        <CheckCircle2 className="w-5 h-5 text-electric-cyan flex-shrink-0" />
                        <span className="font-medium">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ModesShowcase;
