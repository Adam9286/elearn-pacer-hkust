import { motion } from "framer-motion";
import { ChevronDown, Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NetworkGridBackground from "./NetworkGridBackground";
import MagneticButton from "./MagneticButton";
import TextReveal from "./TextReveal";
import Scroll3DElement from "./Scroll3DElement";

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
      
      {/* 3D Scroll Element - Main attraction */}
      <Scroll3DElement />

      {/* Content */}
      <div className="relative z-20 text-center px-4 max-w-5xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-8"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm text-white/80">ELEC3120 Computer Networks</span>
        </motion.div>

        {/* Animated gradient text with TextReveal */}
        <h1 className="text-5xl md:text-7xl font-bold mb-6 relative">
          <TextReveal className="text-white justify-center" delay={0.2}>
            Next-Generation AI
          </TextReveal>
          <br />
          <TextReveal 
            className="bg-gradient-to-r from-neon-blue via-neon-purple to-electric-cyan bg-clip-text text-transparent justify-center"
            delay={0.5}
          >
            Teaching Assistant
          </TextReveal>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="text-xl md:text-2xl text-white/70 mb-12 max-w-2xl mx-auto"
        >
          Master computer networks with AI-powered learning featuring
          personalized tutoring, interactive courses, and adaptive assessments.
        </motion.p>

        {/* CTA Buttons with Magnetic Effect */}
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
            <div className="absolute inset-0 bg-gradient-to-r from-neon-blue via-neon-purple to-electric-cyan"></div>
            <div className="absolute inset-[2px] bg-dark-void rounded-full group-hover:bg-dark-void/80 transition-all duration-300"></div>
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
          className="mt-16 flex flex-wrap justify-center gap-8 md:gap-12"
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
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-neon-blue to-electric-cyan bg-clip-text text-transparent">
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
