import { motion } from "framer-motion";
import { Bot, Cpu, Globe, Shield, Wifi, Zap } from "lucide-react";

const HolographicMascot = () => {
  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
      {/* 1. Glowing Data Platform */}
      <div className="absolute bottom-0 w-full h-1/3 perspective-[500px]">
        <motion.div 
          className="w-full h-full rounded-full border-2 border-electric-cyan/30 bg-electric-cyan/5"
          style={{ transform: "rotateX(60deg)" }}
          animate={{ 
            boxShadow: ["0 0 20px hsl(var(--electric-cyan)/0.2)", "0 0 40px hsl(var(--electric-cyan)/0.4)", "0 0 20px hsl(var(--electric-cyan)/0.2)"] 
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div 
          className="absolute inset-0 rounded-full border border-neon-purple/30"
          style={{ transform: "rotateX(60deg) scale(0.8)" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* 2. The Mascot (Robot/AI Entity) */}
      <motion.div
        className="relative z-10 flex flex-col items-center"
        animate={{ y: [-10, 10, -10] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Head/Body */}
        <div className="relative">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-[0_0_50px_hsl(var(--electric-cyan)/0.3)]">
            <Bot className="w-20 h-20 md:w-24 md:h-24 text-electric-cyan drop-shadow-[0_0_15px_hsl(var(--electric-cyan))]" />
          </div>
          
          {/* Eyes/Visor Glow */}
          <motion.div 
            className="absolute top-10 left-8 right-8 h-4 bg-electric-cyan/80 blur-md rounded-full"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>

        {/* Floating Holographic Elements around it */}
        <div className="absolute inset-0 -z-10">
          {[Wifi, Cpu, Globe, Shield, Zap].map((Icon, i) => (
            <motion.div
              key={i}
              className="absolute text-neon-purple/60"
              style={{
                top: "50%",
                left: "50%",
              }}
              animate={{
                x: Math.cos(i * (Math.PI * 2) / 5) * 120,
                y: Math.sin(i * (Math.PI * 2) / 5) * 40 - 20,
                opacity: [0.4, 0.8, 0.4],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.5,
              }}
            >
              <Icon className="w-6 h-6" />
            </motion.div>
          ))}
        </div>
      </motion.div>
      
      {/* 3. Upward Light Beam */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-20 h-40 bg-gradient-to-t from-electric-cyan/20 to-transparent blur-xl pointer-events-none" />
    </div>
  );
};

export default HolographicMascot;
