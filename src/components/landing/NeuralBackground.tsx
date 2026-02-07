import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const NeuralBackground = () => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; duration: number; delay: number }>>([]);

  useEffect(() => {
    setParticles(Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 5,
    })));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-dark-void">
      {/* 1. Deep Gradient Base */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(220,40%,12%),hsl(220,40%,4%))]" />

      {/* 2. Receding Grid Floor (Perspective) */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          perspective: '1000px',
          transformStyle: 'preserve-3d',
        }}
      >
        <div 
          className="absolute inset-0 origin-bottom"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--electric-cyan) / 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--electric-cyan) / 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            transform: 'rotateX(60deg) translateY(0%) translateZ(-200px) scale(3)',
            maskImage: 'linear-gradient(to top, black 20%, transparent 90%)',
          }} 
        />
      </div>

      {/* 3. Floating Nodes (CSS Animation) */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-electric-cyan"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            boxShadow: '0 0 10px hsl(var(--electric-cyan))',
          }}
          animate={{
            y: [0, -100],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear",
          }}
        />
      ))}

      {/* 4. Data Streams (Vertical Lines) */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={`stream-${i}`}
          className="absolute w-[1px] bg-gradient-to-b from-transparent via-neon-purple to-transparent opacity-40"
          style={{
            height: '40vh',
            left: `${15 + i * 15}%`,
            top: '-40vh',
          }}
          animate={{
            y: ['0vh', '140vh'],
          }}
          transition={{
            duration: 5 + Math.random() * 5,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "linear",
          }}
        />
      ))}

      {/* 5. Vignette & Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,hsl(220,40%,5%)_100%)] pointer-events-none" />
    </div>
  );
};

export default NeuralBackground;
