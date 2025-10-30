import { motion } from "framer-motion";
import { ChevronDown, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AnimatedBackground from "./AnimatedBackground";
import TCPHandshake from "./TCPHandshake";

const Hero = () => {
  const navigate = useNavigate();

  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: "smooth",
    });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <AnimatedBackground />
      <TCPHandshake />

      {/* Content */}
      <div className="relative z-20 text-center px-4 max-w-5xl mx-auto">
        {/* Floating AI Brain/Robot */}
        <div className="relative z-30">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="mb-20"
          >
            <div className="relative inline-block">
              <motion.div
                animate={{
                  rotate: 360,
                  scale: [1, 1.1, 1],
                  rotateY: [0, 360],
                }}
                transition={{
                  rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                  scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                  rotateY: { duration: 10, repeat: Infinity, ease: "linear" },
                }}
                className="w-32 h-32 mx-auto mb-6 relative"
                style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
              >
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-br from-neon-blue to-neon-purple rounded-full blur-2xl opacity-60"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.6, 0.9, 0.6],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-br from-neon-blue via-neon-purple to-electric-cyan rounded-full flex items-center justify-center shadow-2xl"
                  animate={{
                    boxShadow: [
                      '0 0 40px hsl(var(--neon-blue) / 0.5)',
                      '0 0 80px hsl(var(--electric-cyan) / 0.8)',
                      '0 0 40px hsl(var(--neon-blue) / 0.5)',
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                >
                  <Sparkles className="w-16 h-16 text-white animate-sparkle" />
                </motion.div>
              </motion.div>

              {/* Particle effects */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-electric-cyan rounded-full"
                  style={{
                    top: "50%",
                    left: "50%",
                  }}
                  animate={{
                    x: [0, Math.cos((i * 45 * Math.PI) / 180) * 100],
                    y: [0, Math.sin((i * 45 * Math.PI) / 180) * 100],
                    opacity: [1, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Animated gradient text */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="text-5xl md:text-7xl font-bold mb-6 relative"
        >
          <motion.span
            className="bg-gradient-to-r from-neon-blue via-neon-purple to-electric-cyan bg-clip-text text-transparent"
            style={{
              backgroundSize: '200% 200%',
            }}
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            Next-Generation AI
            <br />
            Teaching Assistant
          </motion.span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 1 }}
          className="text-xl md:text-2xl text-white/80 mb-12"
        >
          Where Machine Learning Meets Education
        </motion.p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/platform")}
            className="group relative px-8 py-4 text-lg font-semibold text-white rounded-full overflow-hidden transition-smooth"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-neon-blue via-neon-purple to-electric-cyan animate-rotate-gradient"></div>
            <div className="absolute inset-[2px] bg-dark-void rounded-full"></div>
            <span className="relative flex items-center gap-2">
              Launch Platform
              <Sparkles className="w-5 h-5" />
            </span>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.7, duration: 0.5 }}
            onClick={scrollToContent}
            className="px-8 py-4 text-lg font-semibold text-white/80 hover:text-white border border-white/20 rounded-full hover:border-white/40 transition-smooth"
          >
            <span className="flex items-center gap-2">
              Learn More
              <ChevronDown className="w-5 h-5" />
            </span>
          </motion.button>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <ChevronDown className="w-8 h-8 text-white/50" />
      </motion.div>
    </section>
  );
};

export default Hero;
