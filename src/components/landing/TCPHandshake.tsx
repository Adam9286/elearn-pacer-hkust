import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const TCPHandshake = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % 4);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute top-20 right-10 pointer-events-none">
      <svg width="300" height="200" viewBox="0 0 300 200">
        <defs>
          <filter id="handshake-glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Client node */}
        <g>
          <rect
            x="20"
            y="80"
            width="60"
            height="40"
            rx="8"
            fill="hsl(var(--dark-void) / 0.8)"
            stroke="hsl(var(--neon-blue))"
            strokeWidth="2"
          />
          <text
            x="50"
            y="105"
            textAnchor="middle"
            fill="hsl(var(--electric-cyan))"
            fontSize="12"
            fontWeight="600"
          >
            Client
          </text>
        </g>

        {/* Server node */}
        <g>
          <rect
            x="220"
            y="80"
            width="60"
            height="40"
            rx="8"
            fill="hsl(var(--dark-void) / 0.8)"
            stroke="hsl(var(--neon-purple))"
            strokeWidth="2"
          />
          <text
            x="250"
            y="105"
            textAnchor="middle"
            fill="hsl(var(--neon-pink))"
            fontSize="12"
            fontWeight="600"
          >
            Server
          </text>
        </g>

        {/* SYN packet (step 0) */}
        {step >= 0 && (
          <motion.g
            initial={{ x: 80, y: 100 }}
            animate={{ x: step === 0 ? 220 : 80, y: 100 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          >
            <rect
              x="-15"
              y="-8"
              width="30"
              height="16"
              rx="3"
              fill="hsl(var(--neon-blue))"
              filter="url(#handshake-glow)"
            />
            <text
              x="0"
              y="4"
              textAnchor="middle"
              fill="white"
              fontSize="10"
              fontWeight="700"
            >
              SYN
            </text>
          </motion.g>
        )}

        {/* SYN-ACK packet (step 1) */}
        {step >= 1 && (
          <motion.g
            initial={{ x: 220, y: 100 }}
            animate={{ x: step === 1 ? 80 : 220, y: 100 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          >
            <rect
              x="-25"
              y="-8"
              width="50"
              height="16"
              rx="3"
              fill="hsl(var(--neon-purple))"
              filter="url(#handshake-glow)"
            />
            <text
              x="0"
              y="4"
              textAnchor="middle"
              fill="white"
              fontSize="9"
              fontWeight="700"
            >
              SYN-ACK
            </text>
          </motion.g>
        )}

        {/* ACK packet (step 2) */}
        {step >= 2 && (
          <motion.g
            initial={{ x: 80, y: 100 }}
            animate={{ x: step === 2 ? 220 : 80, y: 100 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          >
            <rect
              x="-15"
              y="-8"
              width="30"
              height="16"
              rx="3"
              fill="hsl(var(--electric-cyan))"
              filter="url(#handshake-glow)"
            />
            <text
              x="0"
              y="4"
              textAnchor="middle"
              fill="white"
              fontSize="10"
              fontWeight="700"
            >
              ACK
            </text>
          </motion.g>
        )}

        {/* Connection established indicator (step 3) */}
        {step === 3 && (
          <motion.g
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <rect
              x="100"
              y="30"
              width="100"
              height="30"
              rx="15"
              fill="hsl(var(--hkust-blue) / 0.3)"
              stroke="hsl(var(--hkust-gold))"
              strokeWidth="2"
            />
            <text
              x="150"
              y="50"
              textAnchor="middle"
              fill="hsl(var(--hkust-gold))"
              fontSize="11"
              fontWeight="700"
            >
              Connected!
            </text>
          </motion.g>
        )}

        {/* Label */}
        <text
          x="150"
          y="180"
          textAnchor="middle"
          fill="hsl(var(--electric-cyan) / 0.6)"
          fontSize="11"
          fontWeight="500"
        >
          TCP 3-Way Handshake
        </text>
      </svg>
    </div>
  );
};

export default TCPHandshake;
