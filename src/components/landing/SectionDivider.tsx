import { motion } from "framer-motion";
import { Brain, Sparkles, Zap } from "lucide-react";

const SectionDivider = () => {
  return (
    <div className="relative h-32 overflow-hidden">
      {/* Animated gradient line */}
      <motion.div
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%"],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-neon-blue to-transparent"
        style={{ backgroundSize: "200% 100%" }}
      />

      {/* Floating icons */}
      <div className="absolute inset-0 flex items-center justify-center gap-16">
        <motion.div
          animate={{
            y: [0, -10, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Brain className="w-8 h-8 text-neon-blue/50" />
        </motion.div>

        <motion.div
          animate={{
            y: [0, -15, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        >
          <Sparkles className="w-6 h-6 text-electric-cyan/50" />
        </motion.div>

        <motion.div
          animate={{
            y: [0, -12, 0],
            rotate: [0, -180, -360],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        >
          <Zap className="w-7 h-7 text-neon-purple/50" />
        </motion.div>
      </div>

      {/* Particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-electric-cyan rounded-full"
          style={{
            left: `${20 + i * 15}%`,
            top: "50%",
          }}
          animate={{
            y: [-20, 20],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

export default SectionDivider;
