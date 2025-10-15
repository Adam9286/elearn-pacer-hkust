import { motion } from "framer-motion";
import { Brain, Sparkles, Zap, Bot, CircuitBoard, Cpu, BrainCircuit, Binary, Activity } from "lucide-react";

interface SectionDividerProps {
  variant?: "neural" | "robot" | "binary" | "wave";
}

const NeuralNetwork = () => {
  const nodes = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    x: (i + 1) * 12.5,
    y: 50,
  }));

  return (
    <div className="absolute inset-0">
      <svg className="w-full h-full">
        {/* Connecting lines */}
        {nodes.slice(0, -1).map((node, i) => (
          <motion.line
            key={`line-${i}`}
            x1={`${node.x}%`}
            y1="50%"
            x2={`${nodes[i + 1].x}%`}
            y2="50%"
            stroke="url(#neuralGradient)"
            strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.6 }}
            transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }}
          />
        ))}
        <defs>
          <linearGradient id="neuralGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--neon-blue))" />
            <stop offset="100%" stopColor="hsl(var(--electric-cyan))" />
          </linearGradient>
        </defs>
      </svg>

      {/* Nodes */}
      {nodes.map((node, i) => (
        <motion.div
          key={`node-${i}`}
          className="absolute w-4 h-4 rounded-full bg-neon-blue"
          style={{ left: `${node.x}%`, top: "50%", transform: "translate(-50%, -50%)" }}
          animate={{
            scale: [1, 1.5, 1],
            boxShadow: [
              "0 0 20px hsl(var(--neon-blue))",
              "0 0 40px hsl(var(--electric-cyan))",
              "0 0 20px hsl(var(--neon-blue))",
            ],
          }}
          transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
        />
      ))}

      {/* Data packets */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={`packet-${i}`}
          className="absolute w-3 h-3 bg-electric-cyan rounded"
          style={{ left: "0%", top: "50%", transform: "translateY(-50%)" }}
          animate={{ left: "100%" }}
          transition={{ duration: 4, delay: i * 1.3, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
};

const RobotAssembly = () => {
  const icons = [Bot, CircuitBoard, Cpu, BrainCircuit, Bot, CircuitBoard];

  return (
    <div className="absolute inset-0 flex items-center">
      {icons.map((Icon, i) => (
        <motion.div
          key={i}
          className="absolute"
          initial={{ x: "-100%", y: 0 }}
          animate={{
            x: "100vw",
            y: [0, -20, 0, -15, 0],
          }}
          transition={{
            x: { duration: 8, delay: i * 1.2, repeat: Infinity, ease: "linear" },
            y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          <Icon 
            className="w-14 h-14 text-electric-cyan" 
            style={{ 
              filter: "drop-shadow(0 0 20px hsl(var(--electric-cyan)))",
            }}
          />
        </motion.div>
      ))}

      {/* Spark effects */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`spark-${i}`}
          className="absolute w-2 h-2 bg-neon-purple rounded-full"
          style={{ left: `${i * 8}%`, top: "50%" }}
          animate={{
            scale: [0, 1.5, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 1.5,
            delay: i * 0.4,
            repeat: Infinity,
          }}
        />
      ))}
    </div>
  );
};

const BinaryStream = () => {
  const columns = 20;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Binary columns */}
      {[...Array(columns)].map((_, i) => (
        <motion.div
          key={`col-${i}`}
          className="absolute top-0 flex flex-col items-center text-electric-cyan font-mono text-xs"
          style={{ left: `${(i / columns) * 100}%` }}
          animate={{ y: ["0%", "100vh"] }}
          transition={{
            duration: 3 + Math.random() * 2,
            delay: i * 0.15,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {[...Array(12)].map((_, j) => (
            <span key={j} className="opacity-80">
              {Math.random() > 0.5 ? "1" : "0"}
            </span>
          ))}
        </motion.div>
      ))}

      {/* Scanning line */}
      <motion.div
        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent"
        animate={{ top: ["0%", "100%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />

      {/* Featured binary sequences */}
      {[0, 1].map((i) => (
        <motion.div
          key={`featured-${i}`}
          className="absolute text-white font-mono text-2xl font-bold"
          style={{ 
            left: `${20 + i * 40}%`, 
            top: "50%",
            filter: "drop-shadow(0 0 10px hsl(var(--neon-blue)))",
          }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0.8, 1.2, 1.2, 0.8],
          }}
          transition={{ duration: 4, delay: i * 2, repeat: Infinity }}
        >
          {i === 0 ? "01001001" : "11010101"}
        </motion.div>
      ))}

      {/* Glitch effects */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`glitch-${i}`}
          className="absolute w-16 h-1 bg-neon-blue/50"
          style={{ left: `${i * 12}%`, top: `${30 + (i % 3) * 20}%` }}
          animate={{
            opacity: [0, 1, 0],
            scaleX: [0, 1, 0],
          }}
          transition={{
            duration: 0.5,
            delay: i * 0.3,
            repeat: Infinity,
            repeatDelay: 2,
          }}
        />
      ))}
    </div>
  );
};

const AIWaves = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Multiple wave layers */}
      {[0, 1, 2].map((i) => (
        <svg key={i} className="absolute w-full h-full" style={{ opacity: 0.6 - i * 0.15 }}>
          <motion.path
            d={`M 0 ${50 + i * 5} Q 25 ${30 + i * 5}, 50 ${50 + i * 5} T 100 ${50 + i * 5}`}
            stroke={i === 0 ? "hsl(var(--neon-purple))" : i === 1 ? "hsl(var(--electric-cyan))" : "hsl(var(--neon-blue))"}
            strokeWidth="3"
            fill="none"
            animate={{
              d: [
                `M 0 ${50 + i * 5} Q 25 ${30 + i * 5}, 50 ${50 + i * 5} T 100 ${50 + i * 5}`,
                `M 0 ${50 + i * 5} Q 25 ${70 + i * 5}, 50 ${50 + i * 5} T 100 ${50 + i * 5}`,
                `M 0 ${50 + i * 5} Q 25 ${30 + i * 5}, 50 ${50 + i * 5} T 100 ${50 + i * 5}`,
              ],
            }}
            transition={{
              duration: 2 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </svg>
      ))}

      {/* Central pulsing icon */}
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          rotate: [0, 180, 360],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Brain 
          className="w-16 h-16 text-neon-purple" 
          style={{ filter: "drop-shadow(0 0 30px hsl(var(--neon-purple)))" }}
        />
      </motion.div>

      {/* Particle bursts at wave peaks */}
      {[...Array(16)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-electric-cyan rounded-full"
          style={{
            left: "50%",
            top: "50%",
          }}
          animate={{
            x: [0, Math.cos((i / 16) * Math.PI * 2) * 100],
            y: [0, Math.sin((i / 16) * Math.PI * 2) * 100],
            opacity: [1, 0],
            scale: [1, 0],
          }}
          transition={{
            duration: 2,
            delay: (i / 16) * 2,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}

      {/* Sparkle effects */}
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={`sparkle-${i}`}
          className="absolute"
          style={{ left: `${25 + i * 16}%`, top: "50%" }}
          animate={{
            y: [-30, 30],
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 2,
            delay: i * 0.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Sparkles className="w-8 h-8 text-electric-cyan" />
        </motion.div>
      ))}
    </div>
  );
};

const SectionDivider = ({ variant = "neural" }: SectionDividerProps) => {
  return (
    <div className="relative h-56 overflow-hidden bg-dark-void/50">
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      {/* Gradient borders */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-blue to-transparent opacity-60" />
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-electric-cyan to-transparent opacity-60" />

      {/* Render variant */}
      {variant === "neural" && <NeuralNetwork />}
      {variant === "robot" && <RobotAssembly />}
      {variant === "binary" && <BinaryStream />}
      {variant === "wave" && <AIWaves />}
    </div>
  );
};

export default SectionDivider;
