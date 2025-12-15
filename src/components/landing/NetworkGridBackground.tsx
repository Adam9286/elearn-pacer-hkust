import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const NetworkGridBackground = () => {
  const [stars, setStars] = useState<Array<{ id: number; x: number; y: number; size: number; delay: number }>>([]);

  // Generate random stars on mount
  useEffect(() => {
    const generatedStars = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      delay: Math.random() * 3,
    }));
    setStars(generatedStars);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-dark-void">
      {/* Deep space base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-dark-void via-[hsl(260,30%,8%)] to-dark-void" />

      {/* Nebula cloud blobs */}
      <motion.div
        className="absolute -top-1/4 -left-1/4 w-[80vw] h-[80vh] rounded-full blur-[120px]"
        style={{
          background: 'radial-gradient(ellipse, hsl(var(--electric-cyan) / 0.15), transparent 70%)',
        }}
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute top-1/4 -right-1/4 w-[70vw] h-[70vh] rounded-full blur-[100px]"
        style={{
          background: 'radial-gradient(ellipse, hsl(var(--neon-purple) / 0.2), transparent 70%)',
        }}
        animate={{
          scale: [1.1, 1, 1.1],
          x: [0, -40, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute bottom-0 left-1/3 w-[60vw] h-[50vh] rounded-full blur-[80px]"
        style={{
          background: 'radial-gradient(ellipse, hsl(300, 70%, 50%, 0.1), transparent 70%)',
        }}
        animate={{
          scale: [1, 1.15, 1],
          x: [0, -30, 0],
          y: [0, -20, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Additional subtle nebula layer */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[60vh] rounded-full blur-[150px]"
        style={{
          background: 'radial-gradient(ellipse, hsl(var(--electric-cyan) / 0.08), hsl(var(--neon-purple) / 0.05), transparent 60%)',
        }}
        animate={{
          rotate: [0, 360],
          scale: [1, 1.1, 1],
        }}
        transition={{
          rotate: { duration: 60, repeat: Infinity, ease: "linear" },
          scale: { duration: 12, repeat: Infinity, ease: "easeInOut" },
        }}
      />

      {/* Star particles */}
      <div className="absolute inset-0">
        {stars.map((star) => (
          <motion.div
            key={star.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
            }}
            animate={{
              opacity: [0.2, 1, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: star.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Shooting stars (occasional) */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={`shooting-${i}`}
          className="absolute w-20 h-[1px]"
          style={{
            background: 'linear-gradient(90deg, transparent, hsl(var(--electric-cyan)), transparent)',
            top: `${20 + i * 25}%`,
            left: '-10%',
          }}
          animate={{
            x: ['0vw', '120vw'],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatDelay: 8 + i * 5,
            delay: i * 4,
            ease: "easeOut",
          }}
        />
      ))}

      {/* Subtle noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Vignette effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, hsl(var(--dark-void)) 100%)',
        }}
      />
    </div>
  );
};

export default NetworkGridBackground;
