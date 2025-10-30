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
    <div className="absolute inset-0 z-[1] pointer-events-none flex items-center justify-center" style={{ perspective: '1000px' }}>
      <div className="w-full max-w-[1400px] h-full" style={{ transformStyle: 'preserve-3d' }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1400 800"
          preserveAspectRatio="xMidYMid meet"
          className="opacity-60"
          style={{ filter: 'drop-shadow(0 0 20px hsl(var(--electric-cyan) / 0.5))' }}
        >
          {/* Filter for glow effect */}
          <defs>
            <filter id="packet-glow">
              <feGaussianBlur stdDeviation="8" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="node-glow">
              <feGaussianBlur stdDeviation="12" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--electric-cyan))" stopOpacity="0.5" />
              <stop offset="50%" stopColor="hsl(var(--neon-purple))" stopOpacity="0.8" />
              <stop offset="100%" stopColor="hsl(var(--electric-cyan))" stopOpacity="0.5" />
            </linearGradient>
          </defs>

          {/* Animated connection line with gradient */}
          <motion.line
            x1="250"
            y1="400"
            x2="1150"
            y2="400"
            stroke="url(#connectionGradient)"
            strokeWidth="3"
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
          
          {/* Circuit board traces */}
          <motion.path
            d="M250,400 L300,380 L400,380 L450,400 L550,400 L600,380 L700,380 L750,400 L850,400 L900,380 L1000,380 L1050,400 L1150,400"
            fill="none"
            stroke="hsl(var(--neon-blue) / 0.3)"
            strokeWidth="1"
            strokeDasharray="5,5"
            animate={{
              strokeDashoffset: [0, -20],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              strokeDashoffset: { duration: 3, repeat: Infinity, ease: "linear" },
              opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            }}
          />

          {/* Enhanced particle flow along connection */}
          {[...Array(10)].map((_, i) => (
            <motion.circle
              key={i}
              cx="250"
              cy="400"
              r={i % 2 === 0 ? "4" : "3"}
              fill={i % 3 === 0 ? "hsl(var(--neon-blue))" : i % 3 === 1 ? "hsl(var(--electric-cyan))" : "hsl(var(--neon-purple))"}
              filter="url(#packet-glow)"
              animate={{
                cx: [250, 1150],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "linear",
              }}
            />
          ))}
          
          {/* Ripple effects on active transmission */}
          {(step === 1 || step === 2 || step === 3) && (
            <>
              <motion.circle
                cx={step === 2 ? "1150" : "250"}
                cy="400"
                r="10"
                fill="none"
                stroke={step === 2 ? "hsl(var(--neon-purple))" : "hsl(var(--electric-cyan))"}
                strokeWidth="2"
                animate={{
                  r: [10, 50],
                  opacity: [0.8, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
              <motion.circle
                cx={step === 2 ? "1150" : "250"}
                cy="400"
                r="10"
                fill="none"
                stroke={step === 2 ? "hsl(var(--neon-purple))" : "hsl(var(--electric-cyan))"}
                strokeWidth="2"
                animate={{
                  r: [10, 50],
                  opacity: [0.8, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: 0.75,
                  ease: "easeOut",
                }}
              />
            </>
          )}

          {/* Client Node with 3D effect */}
          <g style={{ transform: 'rotateY(5deg)', transformOrigin: 'center' }}>
            <motion.rect
              x="70"
              y="340"
              width="180"
              height="120"
              rx="8"
              fill="hsl(var(--neon-blue) / 0.9)"
              stroke="hsl(var(--electric-cyan))"
              strokeWidth="4"
              filter="url(#node-glow)"
              animate={{
                fill: [
                  "hsl(var(--neon-blue) / 0.9)",
                  "hsl(var(--neon-blue) / 1)",
                  "hsl(var(--neon-blue) / 0.9)",
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

          {/* Server Node with 3D effect */}
          <g style={{ transform: 'rotateY(-5deg)', transformOrigin: 'center' }}>
            <motion.rect
              x="1150"
              y="340"
              width="180"
              height="120"
              rx="8"
              fill="hsl(var(--neon-purple) / 0.9)"
              stroke="hsl(var(--neon-pink))"
              strokeWidth="4"
              filter="url(#node-glow)"
              animate={{
                fill: [
                  "hsl(var(--neon-purple) / 0.9)",
                  "hsl(var(--neon-purple) / 1)",
                  "hsl(var(--neon-purple) / 0.9)",
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
