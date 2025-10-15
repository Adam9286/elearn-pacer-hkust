import { motion } from "framer-motion";
import { useState } from "react";
import { Database, FileCode, Mail, Package } from "lucide-react";

interface NetworkBusProps {
  size: "small" | "medium" | "large";
  type: "tcp" | "udp" | "http";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  duration: number;
  delay?: number;
  showLabel?: boolean;
  pathType?: "straight" | "curve";
}

const NetworkBus = ({
  size,
  type,
  startX,
  startY,
  endX,
  endY,
  duration,
  delay = 0,
  showLabel = false,
  pathType = "curve",
}: NetworkBusProps) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const sizeMap = {
    small: { width: 40, height: 20, windows: 2 },
    medium: { width: 60, height: 28, windows: 3 },
    large: { width: 80, height: 36, windows: 4 },
  };

  const typeColors = {
    tcp: { primary: "hsl(var(--neon-blue))", secondary: "hsl(var(--electric-cyan))" },
    udp: { primary: "hsl(var(--neon-purple))", secondary: "hsl(var(--neon-pink))" },
    http: { primary: "hsl(var(--electric-cyan))", secondary: "hsl(var(--neon-blue))" },
  };

  const busSize = sizeMap[size];
  const colors = typeColors[type];

  // Calculate path
  const midX = (startX + endX) / 2;
  const midY = pathType === "curve" ? Math.min(startY, endY) - 100 : (startY + endY) / 2;
  
  const path = pathType === "curve"
    ? `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`
    : `M ${startX} ${startY} L ${endX} ${endY}`;

  const typeLabels = {
    tcp: "TCP Packet",
    udp: "UDP Packet", 
    http: "HTTP Request",
  };

  const packetSizes = {
    small: "128KB",
    medium: "512KB",
    large: "1.5MB",
  };

  const dataIcons = [Database, FileCode, Mail, Package];
  const DataIcon = dataIcons[Math.floor(Math.random() * dataIcons.length)];

  return (
    <motion.g
      initial={{ offsetDistance: "0%" }}
      animate={{ offsetDistance: "100%" }}
      transition={{
        duration,
        delay,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: Math.random() * 2,
      }}
      style={{ offsetPath: `path('${path}')` }}
      onHoverStart={() => setShowTooltip(true)}
      onHoverEnd={() => setShowTooltip(false)}
    >
      {/* Packet size label */}
      <text
        x={0}
        y={-busSize.height / 2 - 15}
        textAnchor="middle"
        fill="hsl(var(--hkust-gold))"
        fontSize={9}
        fontWeight="600"
      >
        {packetSizes[size]}
      </text>

      {/* Bus body */}
      <motion.rect
        x={-busSize.width / 2}
        y={-busSize.height / 2}
        width={busSize.width}
        height={busSize.height}
        rx={4}
        fill={colors.primary}
        stroke={colors.secondary}
        strokeWidth={2}
        filter="url(#bus-glow)"
        animate={{
          filter: [
            "drop-shadow(0 0 8px hsl(var(--neon-blue) / 0.6))",
            "drop-shadow(0 0 16px hsl(var(--electric-cyan) / 0.8))",
            "drop-shadow(0 0 8px hsl(var(--neon-blue) / 0.6))",
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Windows with passengers and data */}
      {Array.from({ length: busSize.windows }).map((_, i) => {
        const passengersPerWindow = size === "large" ? 3 : size === "medium" ? 2 : 1;
        
        return (
          <g key={i}>
            {/* Window background */}
            <motion.rect
              x={-busSize.width / 2 + 8 + i * (busSize.width / busSize.windows)}
              y={-busSize.height / 2 + 6}
              width={busSize.width / busSize.windows - 10}
              height={busSize.height - 12}
              rx={2}
              fill="hsl(var(--electric-cyan) / 0.3)"
              animate={{
                fill: [
                  "hsl(var(--electric-cyan) / 0.3)",
                  "hsl(var(--neon-blue) / 0.6)",
                  "hsl(var(--electric-cyan) / 0.3)",
                ],
              }}
              transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
            />
            
            {/* Passengers (data bits) */}
            {Array.from({ length: passengersPerWindow }).map((_, p) => (
              <motion.circle
                key={`passenger-${p}`}
                cx={-busSize.width / 2 + 12 + i * (busSize.width / busSize.windows) + p * 6}
                cy={-busSize.height / 2 + 12}
                r={2.5}
                fill="hsl(var(--electric-cyan))"
                opacity={0.9}
                animate={{
                  y: [0, -2, 0],
                }}
                transition={{
                  duration: 1.5,
                  delay: p * 0.3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            ))}
            
            {/* Data icon */}
            <g
              transform={`translate(${-busSize.width / 2 + 8 + i * (busSize.width / busSize.windows) + (busSize.width / busSize.windows - 10) / 2}, ${0})`}
            >
              <motion.g
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.4,
                  repeat: Infinity,
                }}
              >
                <DataIcon size={size === "large" ? 10 : size === "medium" ? 8 : 6} color="hsl(var(--hkust-gold))" />
              </motion.g>
            </g>
          </g>
        );
      })}

      {/* Headlights */}
      <circle
        cx={busSize.width / 2 - 4}
        cy={-busSize.height / 2 + 4}
        r={2}
        fill="hsl(var(--hkust-gold))"
        filter="url(#headlight-glow)"
      />
      <circle
        cx={busSize.width / 2 - 4}
        cy={busSize.height / 2 - 4}
        r={2}
        fill="hsl(var(--hkust-gold))"
        filter="url(#headlight-glow)"
      />

      {/* Particle trail */}
      <motion.circle
        cx={-busSize.width / 2 - 10}
        cy={0}
        r={3}
        fill={colors.secondary}
        animate={{
          opacity: [0.8, 0],
          scale: [1, 0.5],
        }}
        transition={{ duration: 0.5, repeat: Infinity }}
      />

      {/* Label on hover */}
      {showTooltip && showLabel && (
        <g>
          <rect
            x={-40}
            y={-busSize.height / 2 - 30}
            width={80}
            height={24}
            rx={4}
            fill="hsl(var(--dark-void) / 0.95)"
            stroke="hsl(var(--neon-blue))"
            strokeWidth={1}
          />
          <text
            x={0}
            y={-busSize.height / 2 - 13}
            textAnchor="middle"
            fill="hsl(var(--electric-cyan))"
            fontSize={10}
            fontWeight="600"
          >
            {typeLabels[type]}
          </text>
        </g>
      )}
    </motion.g>
  );
};

export default NetworkBus;
