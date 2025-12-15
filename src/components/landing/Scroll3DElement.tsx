import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

const Scroll3DElement = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // Smooth spring animation for rotation
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  
  // Rotate from 0 to 180 degrees as user scrolls
  const rotateY = useTransform(smoothProgress, [0, 1], [0, 180]);
  const rotateX = useTransform(smoothProgress, [0, 0.5, 1], [0, 15, 0]);
  const scale = useTransform(smoothProgress, [0, 0.5, 1], [1, 1.1, 0.9]);
  const opacity = useTransform(smoothProgress, [0, 0.8, 1], [1, 1, 0]);
  const y = useTransform(smoothProgress, [0, 1], [0, 100]);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden">
      <motion.div
        className="sticky top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] md:w-[500px] md:h-[500px]"
        style={{
          rotateY,
          rotateX,
          scale,
          opacity,
          y,
          transformPerspective: 1200,
          transformStyle: "preserve-3d",
        }}
      >
        {/* 3D AI Brain/Core */}
        <div className="relative w-full h-full" style={{ transformStyle: "preserve-3d" }}>
          {/* Outer ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            style={{ transformStyle: "preserve-3d" }}
          />
          
          {/* Middle ring - rotated */}
          <motion.div
            className="absolute inset-8 rounded-full border-2 border-cyan-500/30"
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            style={{ 
              transform: "rotateX(60deg)",
              transformStyle: "preserve-3d" 
            }}
          />
          
          {/* Inner ring */}
          <motion.div
            className="absolute inset-16 rounded-full border-2 border-violet-400/40"
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            style={{ 
              transform: "rotateY(60deg)",
              transformStyle: "preserve-3d" 
            }}
          />
          
          {/* Core sphere */}
          <div className="absolute inset-24 rounded-full bg-gradient-to-br from-primary/20 via-cyan-500/20 to-violet-500/20 backdrop-blur-xl">
            {/* Glowing center */}
            <div className="absolute inset-0 rounded-full bg-gradient-radial from-primary/40 via-transparent to-transparent" />
            
            {/* Pulsing effect */}
            <motion.div
              className="absolute inset-0 rounded-full bg-primary/20"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          
          {/* Floating particles around the sphere */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary/60"
              style={{
                top: "50%",
                left: "50%",
                transform: `rotate(${i * 45}deg) translateX(${120 + (i % 3) * 20}px)`,
              }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 2,
                delay: i * 0.2,
                repeat: Infinity,
              }}
            />
          ))}
          
          {/* Connection lines */}
          <svg className="absolute inset-0 w-full h-full" style={{ transform: "translateZ(10px)" }}>
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgb(139, 92, 246)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="rgb(6, 182, 212)" stopOpacity="0.5" />
              </linearGradient>
            </defs>
            {[...Array(6)].map((_, i) => {
              const angle = (i * 60 * Math.PI) / 180;
              const x1 = 250 + Math.cos(angle) * 80;
              const y1 = 250 + Math.sin(angle) * 80;
              const x2 = 250 + Math.cos(angle) * 180;
              const y2 = 250 + Math.sin(angle) * 180;
              
              return (
                <motion.line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="url(#lineGradient)"
                  strokeWidth="1"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: [0.3, 0.7, 0.3] }}
                  transition={{
                    pathLength: { duration: 1, delay: i * 0.1 },
                    opacity: { duration: 2, repeat: Infinity, delay: i * 0.2 }
                  }}
                />
              );
            })}
          </svg>
        </div>
      </motion.div>
    </div>
  );
};

export default Scroll3DElement;
