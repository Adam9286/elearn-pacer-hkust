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
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-dark-void via-navy/30 to-dark-void"></div>
      
      {/* Animated circles */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon-blue/20 rounded-full blur-3xl"
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
            {/* Animated gradient border */}
            <div className="absolute inset-0 bg-gradient-to-r from-neon-blue via-neon-purple to-electric-cyan animate-rotate-gradient"></div>
            <div className="absolute inset-[3px] bg-dark-void rounded-full group-hover:bg-dark-void/80 transition-smooth"></div>
            
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
              <div key={index} className="glass-card p-4 rounded-lg border border-white/20">
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
