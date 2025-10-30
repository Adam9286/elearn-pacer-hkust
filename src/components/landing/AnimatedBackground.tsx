import { motion } from "framer-motion";

const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-dark-void via-navy/50 to-dark-void"></div>
      
      {/* Animated hexagonal mesh pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-20">
        <defs>
          <pattern id="hexPattern" x="0" y="0" width="100" height="87" patternUnits="userSpaceOnUse">
            <motion.path
              d="M50 0 L93.3 25 L93.3 62 L50 87 L6.7 62 L6.7 25 Z"
              fill="none"
              stroke="hsl(var(--electric-cyan))"
              strokeWidth="0.5"
              animate={{
                strokeOpacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hexPattern)" />
      </svg>

      {/* Diagonal data streams */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="streamGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--electric-cyan))" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(var(--electric-cyan))" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(var(--electric-cyan))" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="streamGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--neon-purple))" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(var(--neon-purple))" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(var(--neon-purple))" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Animated diagonal lines */}
        {[...Array(6)].map((_, i) => (
          <motion.line
            key={`stream-${i}`}
            x1={`${i * 20}%`}
            y1="0%"
            x2={`${i * 20 + 30}%`}
            y2="100%"
            stroke={i % 2 === 0 ? "url(#streamGradient1)" : "url(#streamGradient2)"}
            strokeWidth="2"
            strokeDasharray="20,40"
            animate={{
              strokeDashoffset: [0, -120],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              strokeDashoffset: {
                duration: 8,
                repeat: Infinity,
                ease: "linear",
              },
              opacity: {
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.5,
              },
            }}
          />
        ))}
      </svg>

      {/* Floating network particles (increased from 20 to 60) */}
      {[...Array(60)].map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute rounded-full"
          style={{
            width: `${Math.random() * 4 + 1}px`,
            height: `${Math.random() * 4 + 1}px`,
            backgroundColor: i % 3 === 0 
              ? 'hsl(var(--electric-cyan))' 
              : i % 3 === 1 
              ? 'hsl(var(--neon-purple))' 
              : 'hsl(var(--neon-pink))',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            filter: 'blur(1px)',
          }}
          animate={{
            y: [0, -50 - Math.random() * 100, 0],
            x: [0, Math.random() * 40 - 20, 0],
            opacity: [0.2, 0.9, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 4 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Gradient mesh blobs (morph effect) */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, hsl(var(--neon-blue) / 0.25), transparent 70%)',
        }}
        animate={{
          scale: [1, 1.3, 1],
          x: [-50, 50, -50],
          y: [-30, 30, -30],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, hsl(var(--neon-purple) / 0.25), transparent 70%)',
        }}
        animate={{
          scale: [1.3, 1, 1.3],
          x: [50, -50, 50],
          y: [30, -30, 30],
          opacity: [0.6, 0.3, 0.6],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, hsl(var(--electric-cyan) / 0.2), transparent 70%)',
        }}
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360],
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Glassmorphism floating panels */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={`glass-${i}`}
          className="absolute rounded-xl backdrop-blur-sm"
          style={{
            width: '200px',
            height: '150px',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
            border: '1px solid rgba(255,255,255,0.1)',
            left: `${20 + i * 30}%`,
            top: `${30 + i * 20}%`,
          }}
          animate={{
            y: [0, -30, 0],
            rotate: [-2, 2, -2],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 8 + i * 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 1.5,
          }}
        />
      ))}
    </div>
  );
};

export default AnimatedBackground;
