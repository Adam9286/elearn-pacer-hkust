import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface AnimatedParticlesProps {
  count?: number;
  className?: string;
}

/**
 * Memoized animated background particles component
 * Used for decorative floating particle effects
 */
export const AnimatedParticles = React.memo(({ 
  count = 20, 
  className = "bg-primary/20" 
}: AnimatedParticlesProps) => {
  // Memoize the particle configurations so they don't recalculate on every render
  const particles = useMemo(() => 
    Array.from({ length: count }, (_, i) => ({
      id: i,
      initialX: `${Math.random() * 100}%`,
      initialY: `${Math.random() * 100}%`,
      scale: Math.random() * 0.5 + 0.5,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2,
    })),
    [count]
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`absolute w-1 h-1 rounded-full ${className}`}
          initial={{ 
            x: particle.initialX, 
            y: particle.initialY,
            scale: particle.scale
          }}
          animate={{ 
            y: [null, "-20%"],
            opacity: [0.3, 0.8, 0.3]
          }}
          transition={{ 
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay
          }}
        />
      ))}
    </div>
  );
});

AnimatedParticles.displayName = 'AnimatedParticles';
