import { motion } from "framer-motion";
import { ChevronDown, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NetworkGridBackground from "./NetworkGridBackground";
import MagneticButton from "./MagneticButton";
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
      <NetworkGridBackground />
      
      {/* Radial spotlight on TCP animation area */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(ellipse, hsl(var(--electric-cyan) / 0.08) 0%, hsl(var(--neon-purple) / 0.05) 40%, transparent 70%)',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-20 text-center px-4 max-w-6xl mx-auto flex flex-col items-center">
        
        {/* LearningPacer Brand - Main Focus */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-4"
        >
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tight">
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-electric-cyan via-neon-purple to-neon-pink bg-clip-text text-transparent">
                Learning
              </span>
              <motion.span
                className="absolute -inset-1 bg-gradient-to-r from-electric-cyan via-neon-purple to-neon-pink opacity-30 blur-2xl"
                animate={{ 
                  opacity: [0.2, 0.4, 0.2],
                  scale: [1, 1.05, 1]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </span>
            <span className="bg-gradient-to-r from-neon-purple via-neon-pink to-hkust-gold bg-clip-text text-transparent">
              Pacer
            </span>
          </h1>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-lg md:text-xl text-white/60 mb-8 max-w-xl"
        >
          Master Network Protocols Through Interactive Visualization
        </motion.p>

        {/* TCP Handshake Animation - Centerpiece */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="relative w-full max-w-4xl h-[300px] md:h-[350px] mb-8"
        >
          {/* Glassmorphism container */}
          <div className="absolute inset-0 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl" />
            
            {/* Corner decorations */}
            <div className="absolute top-0 left-0 w-16 h-16">
              <div className="absolute top-2 left-2 w-8 h-[2px] bg-gradient-to-r from-electric-cyan to-transparent" />
              <div className="absolute top-2 left-2 w-[2px] h-8 bg-gradient-to-b from-electric-cyan to-transparent" />
            </div>
            <div className="absolute top-0 right-0 w-16 h-16">
              <div className="absolute top-2 right-2 w-8 h-[2px] bg-gradient-to-l from-neon-purple to-transparent" />
              <div className="absolute top-2 right-2 w-[2px] h-8 bg-gradient-to-b from-neon-purple to-transparent" />
            </div>
            <div className="absolute bottom-0 left-0 w-16 h-16">
              <div className="absolute bottom-2 left-2 w-8 h-[2px] bg-gradient-to-r from-electric-cyan to-transparent" />
              <div className="absolute bottom-2 left-2 w-[2px] h-8 bg-gradient-to-t from-electric-cyan to-transparent" />
            </div>
            <div className="absolute bottom-0 right-0 w-16 h-16">
              <div className="absolute bottom-2 right-2 w-8 h-[2px] bg-gradient-to-l from-neon-purple to-transparent" />
              <div className="absolute bottom-2 right-2 w-[2px] h-8 bg-gradient-to-t from-neon-purple to-transparent" />
            </div>
            
            {/* Animated border glow */}
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                boxShadow: '0 0 30px hsl(var(--electric-cyan) / 0.2), inset 0 0 30px hsl(var(--neon-purple) / 0.1)'
              }}
              animate={{
                boxShadow: [
                  '0 0 30px hsl(var(--electric-cyan) / 0.2), inset 0 0 30px hsl(var(--neon-purple) / 0.1)',
                  '0 0 50px hsl(var(--electric-cyan) / 0.3), inset 0 0 40px hsl(var(--neon-purple) / 0.2)',
                  '0 0 30px hsl(var(--electric-cyan) / 0.2), inset 0 0 30px hsl(var(--neon-purple) / 0.1)',
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </div>
          
          {/* TCP Handshake Component */}
          <TCPHandshake />
        </motion.div>

        {/* Course Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-6"
        >
          <div className="w-2 h-2 rounded-full bg-electric-cyan animate-pulse" />
          <span className="text-sm text-white/70">ELEC3120 Computer Networks</span>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <MagneticButton
            onClick={() => navigate("/platform")}
            className="group relative px-8 py-4 text-lg font-semibold text-white rounded-full overflow-hidden"
            strength={0.4}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-electric-cyan via-neon-purple to-neon-pink" />
            <div className="absolute inset-[2px] bg-dark-void rounded-full group-hover:bg-dark-void/80 transition-all duration-300" />
            <span className="relative flex items-center gap-2">
              Launch Platform
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </MagneticButton>

          <MagneticButton
            onClick={scrollToContent}
            className="px-8 py-4 text-lg font-semibold text-white/80 hover:text-white border border-white/20 rounded-full hover:border-white/40 transition-all duration-300 backdrop-blur-sm"
            strength={0.3}
          >
            <span className="flex items-center gap-2">
              Learn More
              <ChevronDown className="w-5 h-5" />
            </span>
          </MagneticButton>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="mt-12 flex flex-wrap justify-center gap-8 md:gap-12"
        >
          {[
            { label: "Learning Modes", value: "3" },
            { label: "AI-Powered", value: "100%" },
            { label: "Topics Covered", value: "50+" },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              className="text-center"
              whileHover={{ scale: 1.05, y: -2 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-electric-cyan to-neon-purple bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-sm text-white/50 mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
      >
        <motion.div
          className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2 cursor-pointer hover:border-white/40 transition-colors"
          onClick={scrollToContent}
          whileHover={{ scale: 1.1 }}
        >
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-electric-cyan"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
