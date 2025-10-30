import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CTA = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.3,
  });
  
  const navigate = useNavigate();

  const handleLaunch = () => {
    navigate("/platform");
  };

  return (
    <section ref={ref} className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Launch Sequence Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-dark-void via-navy/30 to-dark-void"></div>
      
      {/* Concentric Pulsing Rings */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={`ring-${i}`}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full border border-electric-cyan/30"
          style={{
            width: `${200 + i * 150}px`,
            height: `${200 + i * 150}px`,
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0.1, 0.5],
          }}
          transition={{
            duration: 4,
            delay: i * 0.4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}

      {/* Rocket Trail Particles from Edges */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => {
          const angle = (i * 18) * (Math.PI / 180);
          return (
            <motion.div
              key={`particle-${i}`}
              className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-electric-cyan to-neon-blue"
              style={{
                left: "50%",
                top: "50%",
              }}
              animate={{
                x: [
                  Math.cos(angle) * 600,
                  Math.cos(angle) * 100,
                  Math.cos(angle) * 600
                ],
                y: [
                  Math.sin(angle) * 600,
                  Math.sin(angle) * 100,
                  Math.sin(angle) * 600
                ],
                opacity: [0, 1, 0],
                scale: [0, 1, 0]
              }}
              transition={{
                duration: 3,
                delay: i * 0.1,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          );
        })}
      </div>

      {/* Electric Arcs */}
      <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--electric-cyan))" stopOpacity="0.8" />
            <stop offset="50%" stopColor="hsl(var(--neon-purple))" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(var(--neon-blue))" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        {[...Array(4)].map((_, i) => (
          <motion.path
            key={`arc-${i}`}
            d={`M ${20 + i * 20}% 50% Q 50% ${30 + i * 10}%, ${80 - i * 20}% 50%`}
            stroke="url(#arcGradient)"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: [0, 1, 0],
              opacity: [0, 0.6, 0]
            }}
            transition={{
              duration: 2,
              delay: i * 0.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </svg>

      {/* Energy Field Distortion */}
      <motion.div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(var(--neon-blue) / 0.3) 0%, transparent 70%)",
          filter: "blur(40px)"
        }}
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      <div className="container mx-auto relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          {/* Sparkle icon */}
          <motion.div
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              rotate: { duration: 20, repeat: Infinity, ease: "linear" },
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
            className="inline-block mb-8"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center shadow-glow">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-neon-blue via-neon-purple to-electric-cyan bg-clip-text text-transparent"
          >
            Ready to Transform Your Learning?
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-white mb-12 font-medium"
          >
            Start mastering ELEC3120 with AI-powered guidance
          </motion.p>

          {/* Main CTA Button */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.6 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLaunch}
            className="group relative inline-flex items-center gap-3 px-12 py-6 text-xl font-bold text-white rounded-full overflow-hidden transition-smooth"
          >
            {/* Particle Explosion on Hover */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(12)].map((_, i) => {
                const angle = (i * 30) * (Math.PI / 180);
                return (
                  <motion.div
                    key={i}
                    className="absolute top-1/2 left-1/2 w-1 h-1 rounded-full bg-electric-cyan"
                    initial={{ x: 0, y: 0, opacity: 0 }}
                    whileHover={{
                      x: Math.cos(angle) * 60,
                      y: Math.sin(angle) * 60,
                      opacity: [0, 1, 0],
                    }}
                    transition={{ duration: 0.8 }}
                  />
                );
              })}
            </div>

            {/* Animated gradient border */}
            <div className="absolute inset-0 bg-gradient-to-r from-neon-blue via-neon-purple to-electric-cyan animate-rotate-gradient"></div>
            <div className="absolute inset-[3px] bg-dark-void rounded-full group-hover:bg-dark-void/80 transition-smooth"></div>
            
            {/* Chromatic Aberration Effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-neon-blue to-electric-cyan opacity-0 group-hover:opacity-30 rounded-full blur-md"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.3 }}
            />
            
            <span className="relative flex items-center gap-3">
              Launch LearningPacer
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-smooth" />
            </span>
          </motion.button>

          {/* Stats/features below */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto"
          >
            {[
              { value: "RAG-Powered", label: "AI Accuracy" },
              { value: "3 Modes", label: "Learning Paths" },
              { value: "Real-time", label: "Feedback" }
            ].map((stat, index) => (
              <div key={index} className="glass-card-landing p-4 rounded-lg border border-white/20">
                <div className="text-2xl font-bold bg-gradient-to-r from-white to-electric-cyan bg-clip-text text-transparent mb-1">
                  {stat.value}
                </div>
                <div className="text-white text-sm font-medium">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
