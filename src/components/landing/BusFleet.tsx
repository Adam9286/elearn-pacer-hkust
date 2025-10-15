import { motion } from "framer-motion";
import NetworkBus from "./NetworkBus";
import { useEffect, useState } from "react";

const BusFleet = () => {
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1920
  );

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Background ambient buses
  const ambientBuses = [
    { size: "small" as const, type: "tcp" as const, startX: 0, startY: 200, endX: viewportWidth, endY: 250, duration: 12 },
    { size: "medium" as const, type: "http" as const, startX: viewportWidth, startY: 400, endX: 0, endY: 450, duration: 15 },
    { size: "small" as const, type: "udp" as const, startX: 0, startY: 600, endX: viewportWidth, endY: 580, duration: 8 },
    { size: "large" as const, type: "tcp" as const, startX: viewportWidth, startY: 800, endX: 0, endY: 850, duration: 18 },
    { size: "small" as const, type: "http" as const, startX: 0, startY: 1000, endX: viewportWidth, endY: 1020, duration: 10 },
    { size: "medium" as const, type: "tcp" as const, startX: viewportWidth, startY: 1200, endX: 0, endY: 1180, duration: 14 },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none z-10 opacity-40">
      <svg width="100%" height="100%" className="absolute inset-0">
        <defs>
          <filter id="bus-glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="headlight-glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="trail-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--neon-blue))" stopOpacity="0" />
            <stop offset="100%" stopColor="hsl(var(--electric-cyan))" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {ambientBuses.map((bus, index) => (
          <NetworkBus
            key={index}
            size={bus.size}
            type={bus.type}
            startX={bus.startX}
            startY={bus.startY}
            endX={bus.endX}
            endY={bus.endY}
            duration={bus.duration}
            delay={index * 1.5}
            showLabel={false}
            pathType="curve"
          />
        ))}
      </svg>

      {/* Grid background for network feel */}
      <div className="absolute inset-0 opacity-10">
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--neon-blue) / 0.3) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--neon-blue) / 0.3) 1px, transparent 1px)
            `,
            backgroundSize: "100px 100px",
          }}
          animate={{
            backgroundPosition: ["0px 0px", "100px 100px"],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>
    </div>
  );
};

export default BusFleet;
