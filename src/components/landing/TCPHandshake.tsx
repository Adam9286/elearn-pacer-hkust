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

  // Generate orbital particles
  const orbitalParticles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    delay: i * 0.5,
    size: i % 2 === 0 ? 3 : 2,
  }));

  return (
    <div className="absolute inset-0 z-[1] flex items-center justify-center">
      <div className="w-full h-full">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 900 350"
          preserveAspectRatio="xMidYMid meet"
          className="opacity-90"
        >
          {/* Filters and gradients */}
          <defs>
            <filter id="packet-glow-hero">
              <feGaussianBlur stdDeviation="6" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="node-glow-hero">
              <feGaussianBlur stdDeviation="10" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="connectionGradientHero" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--electric-cyan))" stopOpacity="0.6" />
              <stop offset="50%" stopColor="hsl(var(--neon-purple))" stopOpacity="0.9" />
              <stop offset="100%" stopColor="hsl(var(--electric-cyan))" stopOpacity="0.6" />
            </linearGradient>
            <radialGradient id="nodeGlowClient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(var(--electric-cyan))" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(var(--electric-cyan))" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="nodeGlowServer" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(var(--neon-purple))" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(var(--neon-purple))" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Main connection line */}
          <motion.line
            x1="180"
            y1="175"
            x2="720"
            y2="175"
            stroke="url(#connectionGradientHero)"
            strokeWidth="2"
            strokeDasharray="8,4"
            animate={{
              strokeDashoffset: [0, -24],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
            }}
          />

          {/* Data flow particles */}
          {[...Array(6)].map((_, i) => (
            <motion.circle
              key={`flow-${i}`}
              cx="180"
              cy="175"
              r="2"
              fill={i % 2 === 0 ? "hsl(var(--electric-cyan))" : "hsl(var(--neon-purple))"}
              animate={{
                cx: [180, 720],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: i * 0.4,
                ease: "linear",
              }}
            />
          ))}

          {/* Client node glow background */}
          <circle cx="100" cy="175" r="80" fill="url(#nodeGlowClient)" />
          
          {/* Client Node */}
          <motion.g>
            <motion.rect
              x="40"
              y="125"
              width="120"
              height="100"
              rx="12"
              fill="hsl(var(--dark-void))"
              stroke="hsl(var(--electric-cyan))"
              strokeWidth="2"
              filter="url(#node-glow-hero)"
              animate={{
                strokeOpacity: [0.8, 1, 0.8],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            {/* Client icon */}
            <rect x="70" y="145" width="60" height="40" rx="4" fill="hsl(var(--electric-cyan) / 0.2)" stroke="hsl(var(--electric-cyan) / 0.5)" strokeWidth="1" />
            <rect x="85" y="185" width="30" height="6" rx="2" fill="hsl(var(--electric-cyan) / 0.3)" />
            <text x="100" y="210" textAnchor="middle" fill="white" fontSize="14" fontWeight="600">
              Client
            </text>
            
            {/* Orbital particles around client */}
            {orbitalParticles.slice(0, 4).map((particle) => (
              <motion.circle
                key={`client-orbit-${particle.id}`}
                cx="100"
                cy="175"
                r={particle.size}
                fill="hsl(var(--electric-cyan))"
                animate={{
                  cx: [100 + 70 * Math.cos(particle.id * Math.PI / 2), 100 + 70 * Math.cos(particle.id * Math.PI / 2 + Math.PI * 2)],
                  cy: [175 + 70 * Math.sin(particle.id * Math.PI / 2), 175 + 70 * Math.sin(particle.id * Math.PI / 2 + Math.PI * 2)],
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  delay: particle.delay,
                  ease: "linear",
                }}
              />
            ))}
          </motion.g>

          {/* Server node glow background */}
          <circle cx="800" cy="175" r="80" fill="url(#nodeGlowServer)" />

          {/* Server Node */}
          <motion.g>
            <motion.rect
              x="740"
              y="125"
              width="120"
              height="100"
              rx="12"
              fill="hsl(var(--dark-void))"
              stroke="hsl(var(--neon-purple))"
              strokeWidth="2"
              filter="url(#node-glow-hero)"
              animate={{
                strokeOpacity: [0.8, 1, 0.8],
              }}
              transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            />
            {/* Server icon - rack */}
            <rect x="770" y="140" width="60" height="15" rx="2" fill="hsl(var(--neon-purple) / 0.2)" stroke="hsl(var(--neon-purple) / 0.5)" strokeWidth="1" />
            <rect x="770" y="158" width="60" height="15" rx="2" fill="hsl(var(--neon-purple) / 0.2)" stroke="hsl(var(--neon-purple) / 0.5)" strokeWidth="1" />
            <rect x="770" y="176" width="60" height="15" rx="2" fill="hsl(var(--neon-purple) / 0.2)" stroke="hsl(var(--neon-purple) / 0.5)" strokeWidth="1" />
            {/* Server LEDs */}
            <motion.circle cx="780" cy="147" r="2" fill="hsl(var(--neon-green))" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.5, repeat: Infinity }} />
            <motion.circle cx="780" cy="165" r="2" fill="hsl(var(--neon-green))" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.7, repeat: Infinity }} />
            <motion.circle cx="780" cy="183" r="2" fill="hsl(var(--electric-cyan))" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.6, repeat: Infinity }} />
            <text x="800" y="210" textAnchor="middle" fill="white" fontSize="14" fontWeight="600">
              Server
            </text>
            
            {/* Orbital particles around server */}
            {orbitalParticles.slice(4).map((particle) => (
              <motion.circle
                key={`server-orbit-${particle.id}`}
                cx="800"
                cy="175"
                r={particle.size}
                fill="hsl(var(--neon-purple))"
                animate={{
                  cx: [800 + 70 * Math.cos(particle.id * Math.PI / 2), 800 + 70 * Math.cos(particle.id * Math.PI / 2 + Math.PI * 2)],
                  cy: [175 + 70 * Math.sin(particle.id * Math.PI / 2), 175 + 70 * Math.sin(particle.id * Math.PI / 2 + Math.PI * 2)],
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  delay: particle.delay,
                  ease: "linear",
                }}
              />
            ))}
          </motion.g>

          {/* Ripple effects on transmission */}
          {step >= 1 && step <= 3 && (
            <>
              <motion.circle
                cx={step === 2 ? 720 : 180}
                cy="175"
                r="10"
                fill="none"
                stroke={step === 2 ? "hsl(var(--neon-purple))" : "hsl(var(--electric-cyan))"}
                strokeWidth="2"
                initial={{ r: 10, opacity: 0.8 }}
                animate={{ r: 40, opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <motion.circle
                cx={step === 2 ? 720 : 180}
                cy="175"
                r="10"
                fill="none"
                stroke={step === 2 ? "hsl(var(--neon-purple))" : "hsl(var(--electric-cyan))"}
                strokeWidth="2"
                initial={{ r: 10, opacity: 0.6 }}
                animate={{ r: 40, opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
              />
            </>
          )}

          {/* Step labels */}
          <motion.text
            x="450"
            y="50"
            textAnchor="middle"
            fontSize="16"
            fontWeight="700"
            key={`label-${step}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {step === 0 && (
              <tspan fill="hsl(var(--hkust-gold))">✓ Connection Established</tspan>
            )}
            {step === 1 && (
              <tspan fill="hsl(var(--electric-cyan))">Step 1: SYN →</tspan>
            )}
            {step === 2 && (
              <tspan fill="hsl(var(--neon-purple))">Step 2: ← SYN-ACK</tspan>
            )}
            {step === 3 && (
              <tspan fill="hsl(var(--electric-cyan))">Step 3: ACK →</tspan>
            )}
          </motion.text>

          {/* Packet animations */}
          {step === 1 && (
            <motion.g
              initial={{ x: 180, opacity: 0 }}
              animate={{ x: 720, opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            >
              <rect
                x="-30"
                y="160"
                width="60"
                height="30"
                rx="6"
                fill="hsl(var(--neon-blue))"
                stroke="hsl(var(--electric-cyan))"
                strokeWidth="2"
                filter="url(#packet-glow-hero)"
              />
              <text x="0" y="180" textAnchor="middle" fill="white" fontSize="14" fontWeight="700">
                SYN
              </text>
              {/* Trailing particles */}
              <motion.circle cx="-45" cy="175" r="3" fill="hsl(var(--electric-cyan))" animate={{ opacity: [0.8, 0], scale: [1, 0.5] }} transition={{ duration: 0.4, repeat: Infinity }} />
              <motion.circle cx="-55" cy="175" r="2" fill="hsl(var(--electric-cyan))" animate={{ opacity: [0.6, 0], scale: [1, 0.3] }} transition={{ duration: 0.4, repeat: Infinity, delay: 0.1 }} />
            </motion.g>
          )}

          {step === 2 && (
            <motion.g
              initial={{ x: 720, opacity: 0 }}
              animate={{ x: 180, opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            >
              <rect
                x="-45"
                y="160"
                width="90"
                height="30"
                rx="6"
                fill="hsl(var(--neon-purple))"
                stroke="hsl(var(--neon-pink))"
                strokeWidth="2"
                filter="url(#packet-glow-hero)"
              />
              <text x="0" y="180" textAnchor="middle" fill="white" fontSize="13" fontWeight="700">
                SYN-ACK
              </text>
              <motion.circle cx="55" cy="175" r="3" fill="hsl(var(--neon-pink))" animate={{ opacity: [0.8, 0], scale: [1, 0.5] }} transition={{ duration: 0.4, repeat: Infinity }} />
              <motion.circle cx="65" cy="175" r="2" fill="hsl(var(--neon-pink))" animate={{ opacity: [0.6, 0], scale: [1, 0.3] }} transition={{ duration: 0.4, repeat: Infinity, delay: 0.1 }} />
            </motion.g>
          )}

          {step === 3 && (
            <motion.g
              initial={{ x: 180, opacity: 0 }}
              animate={{ x: 720, opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            >
              <rect
                x="-30"
                y="160"
                width="60"
                height="30"
                rx="6"
                fill="hsl(var(--electric-cyan))"
                stroke="hsl(var(--neon-blue))"
                strokeWidth="2"
                filter="url(#packet-glow-hero)"
              />
              <text x="0" y="180" textAnchor="middle" fill="white" fontSize="14" fontWeight="700">
                ACK
              </text>
              <motion.circle cx="-45" cy="175" r="3" fill="hsl(var(--neon-blue))" animate={{ opacity: [0.8, 0], scale: [1, 0.5] }} transition={{ duration: 0.4, repeat: Infinity }} />
              <motion.circle cx="-55" cy="175" r="2" fill="hsl(var(--neon-blue))" animate={{ opacity: [0.6, 0], scale: [1, 0.3] }} transition={{ duration: 0.4, repeat: Infinity, delay: 0.1 }} />
            </motion.g>
          )}

          {/* Celebration particles on connection established */}
          {step === 0 && (
            <>
              {[...Array(12)].map((_, i) => {
                const angle = (i / 12) * Math.PI * 2;
                return (
                  <motion.circle
                    key={`celebration-${i}`}
                    cx="450"
                    cy="175"
                    r="3"
                    fill={i % 3 === 0 ? "hsl(var(--hkust-gold))" : i % 3 === 1 ? "hsl(var(--electric-cyan))" : "hsl(var(--neon-purple))"}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      cx: [450, 450 + Math.cos(angle) * 80],
                      cy: [175, 175 + Math.sin(angle) * 50],
                      opacity: [1, 0],
                      scale: [1, 0],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                  />
                );
              })}
            </>
          )}

          {/* Status bar at bottom */}
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <rect x="350" y="300" width="200" height="30" rx="15" fill="hsl(var(--dark-void))" stroke="hsl(var(--white) / 0.1)" strokeWidth="1" />
            <motion.rect
              x="355"
              y="305"
              width={step === 0 ? 190 : step * 60}
              height="20"
              rx="10"
              fill={step === 0 ? "hsl(var(--hkust-gold) / 0.6)" : "hsl(var(--electric-cyan) / 0.4)"}
              animate={{
                width: step === 0 ? 190 : step * 60,
              }}
              transition={{ duration: 0.5 }}
            />
            <text x="450" y="320" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">
              {step === 0 ? "CONNECTED" : `${Math.round((step / 3) * 100)}%`}
            </text>
          </motion.g>
        </svg>
      </div>
    </div>
  );
};

export default TCPHandshake;
