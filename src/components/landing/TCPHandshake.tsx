import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const TCPHandshake = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % 4);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 z-[1] pointer-events-none flex items-center justify-center">
      <div className="w-full max-w-[1400px] h-full">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1400 800"
          preserveAspectRatio="xMidYMid meet"
          className="opacity-30"
        >
          {/* Filter for glow effect */}
          <defs>
            <filter id="packet-glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="node-glow">
              <feGaussianBlur stdDeviation="6" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Animated connection line */}
          <motion.line
            x1="250"
            y1="400"
            x2="1150"
            y2="400"
            stroke="hsl(var(--electric-cyan) / 0.3)"
            strokeWidth="2"
            strokeDasharray="10,5"
            animate={{
              strokeDashoffset: [0, -30],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
          />

          {/* Particle flow along connection */}
          {[...Array(5)].map((_, i) => (
            <motion.circle
              key={i}
              cx="250"
              cy="400"
              r="3"
              fill="hsl(var(--neon-blue))"
              animate={{
                cx: [250, 1150],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.6,
                ease: "linear",
              }}
            />
          ))}

          {/* Client Node */}
          <g>
            <motion.rect
              x="70"
              y="340"
              width="180"
              height="120"
              rx="8"
              fill="hsl(var(--neon-blue) / 0.8)"
              stroke="hsl(var(--electric-cyan))"
              strokeWidth="3"
              filter="url(#node-glow)"
              animate={{
                boxShadow: [
                  "0 0 20px hsl(var(--neon-blue) / 0.5)",
                  "0 0 40px hsl(var(--electric-cyan) / 0.8)",
                  "0 0 20px hsl(var(--neon-blue) / 0.5)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <text x="160" y="395" textAnchor="middle" fill="white" fontSize="18" fontWeight="700">
              Client
            </text>
            <text x="160" y="420" textAnchor="middle" fill="hsl(var(--electric-cyan))" fontSize="12" fontWeight="600">
              Port 3000
            </text>
            <text x="160" y="440" textAnchor="middle" fill="hsl(var(--hkust-gold))" fontSize="11" opacity="0.8">
              192.168.1.100
            </text>
          </g>

          {/* Server Node */}
          <g>
            <motion.rect
              x="1150"
              y="340"
              width="180"
              height="120"
              rx="8"
              fill="hsl(var(--neon-purple) / 0.8)"
              stroke="hsl(var(--neon-pink))"
              strokeWidth="3"
              filter="url(#node-glow)"
              animate={{
                boxShadow: [
                  "0 0 20px hsl(var(--neon-purple) / 0.5)",
                  "0 0 40px hsl(var(--neon-pink) / 0.8)",
                  "0 0 20px hsl(var(--neon-purple) / 0.5)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            />
            <text x="1240" y="395" textAnchor="middle" fill="white" fontSize="18" fontWeight="700">
              Server
            </text>
            <text x="1240" y="420" textAnchor="middle" fill="hsl(var(--neon-pink))" fontSize="12" fontWeight="600">
              Port 443
            </text>
            <text x="1240" y="440" textAnchor="middle" fill="hsl(var(--hkust-gold))" fontSize="11" opacity="0.8">
              10.0.0.1
            </text>
          </g>

          {/* Step labels */}
          {step === 1 && (
            <motion.text
              x="700"
              y="280"
              textAnchor="middle"
              fill="hsl(var(--electric-cyan))"
              fontSize="16"
              fontWeight="600"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Step 1: SYN →
            </motion.text>
          )}
          {step === 2 && (
            <motion.text
              x="700"
              y="280"
              textAnchor="middle"
              fill="hsl(var(--electric-cyan))"
              fontSize="16"
              fontWeight="600"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Step 2: ← SYN-ACK
            </motion.text>
          )}
          {step === 3 && (
            <motion.text
              x="700"
              y="280"
              textAnchor="middle"
              fill="hsl(var(--electric-cyan))"
              fontSize="16"
              fontWeight="600"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Step 3: ACK →
            </motion.text>
          )}
          {step === 0 && (
            <motion.text
              x="700"
              y="280"
              textAnchor="middle"
              fill="hsl(var(--hkust-gold))"
              fontSize="16"
              fontWeight="600"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              ✓ Handshake Complete
            </motion.text>
          )}

          {/* Step 1: SYN */}
          {step === 1 && (
            <motion.g
              key={`syn-${step}`}
              initial={{ x: 250, opacity: 0 }}
              animate={{ x: 1150, opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            >
              <rect
                x="-30"
                y="365"
                width="60"
                height="35"
                rx="4"
                fill="hsl(var(--neon-blue))"
                stroke="hsl(var(--electric-cyan))"
                strokeWidth="2"
                filter="url(#packet-glow)"
              />
              <text x="0" y="388" textAnchor="middle" fill="white" fontSize="16" fontWeight="700">
                SYN
              </text>
              {/* Particle trail */}
              <motion.circle
                cx="-40"
                cy="382"
                r="4"
                fill="hsl(var(--electric-cyan))"
                animate={{
                  opacity: [0.8, 0],
                  scale: [1, 0.3],
                }}
                transition={{ duration: 0.6, repeat: Infinity }}
              />
            </motion.g>
          )}

          {/* Step 2: SYN-ACK */}
          {step === 2 && (
            <motion.g
              key={`syn-ack-${step}`}
              initial={{ x: 1150, opacity: 0 }}
              animate={{ x: 250, opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            >
              <rect
                x="-40"
                y="410"
                width="80"
                height="35"
                rx="4"
                fill="hsl(var(--neon-purple))"
                stroke="hsl(var(--neon-pink))"
                strokeWidth="2"
                filter="url(#packet-glow)"
              />
              <text x="0" y="433" textAnchor="middle" fill="white" fontSize="14" fontWeight="700">
                SYN-ACK
              </text>
              {/* Particle trail */}
              <motion.circle
                cx="50"
                cy="427"
                r="4"
                fill="hsl(var(--neon-pink))"
                animate={{
                  opacity: [0.8, 0],
                  scale: [1, 0.3],
                }}
                transition={{ duration: 0.6, repeat: Infinity }}
              />
            </motion.g>
          )}

          {/* Step 3: ACK */}
          {step === 3 && (
            <motion.g
              key={`ack-${step}`}
              initial={{ x: 250, opacity: 0 }}
              animate={{ x: 1150, opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            >
              <rect
                x="-30"
                y="455"
                width="60"
                height="35"
                rx="4"
                fill="hsl(var(--electric-cyan))"
                stroke="hsl(var(--neon-blue))"
                strokeWidth="2"
                filter="url(#packet-glow)"
              />
              <text x="0" y="478" textAnchor="middle" fill="white" fontSize="16" fontWeight="700">
                ACK
              </text>
              {/* Particle trail */}
              <motion.circle
                cx="-40"
                cy="472"
                r="4"
                fill="hsl(var(--neon-blue))"
                animate={{
                  opacity: [0.8, 0],
                  scale: [1, 0.3],
                }}
                transition={{ duration: 0.6, repeat: Infinity }}
              />
            </motion.g>
          )}

          {/* Connected indicator & bandwidth */}
          {step === 0 && (
            <motion.g
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <text x="700" y="50" textAnchor="middle" fill="hsl(var(--hkust-gold))" fontSize="22" fontWeight="700">
                ✓ Connection Established
              </text>
              <text
                x="700"
                y="75"
                textAnchor="middle"
                fill="hsl(var(--electric-cyan))"
                fontSize="14"
                fontWeight="600"
                opacity="0.8"
              >
                Bandwidth: 100 Mbps • Latency: 12ms
              </text>
            </motion.g>
          )}
        </svg>
      </div>
    </div>
  );
};

export default TCPHandshake;
