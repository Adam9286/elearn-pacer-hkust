import { motion } from "framer-motion";

type Props = {
  value: string;
  label: string;
  sub: string;
  color: string;
  ring?: number;
  delay: number;
};

const StatCell = ({ value, label, sub, color, ring, delay }: Props) => {
  const numericVal = parseInt(value.replace(/[^0-9]/g, ""), 10) || 0;
  const suffix = value.replace(/[0-9,]/g, "");

  const circumference = 2 * Math.PI * 22;
  const pct = ring || 0;

  return (
    <motion.div
      initial={{ opacity: 0.9, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.55, ease: "easeOut", delay: 0.08 * delay }}
      style={{
        padding: "1.5rem 1.75rem",
        background: "#030816",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {ring !== undefined && (
        <svg
          style={{ position: "absolute", top: 8, right: 8, opacity: 0.18 }}
          width="52"
          height="52"
          viewBox="0 0 52 52"
        >
          <circle
            cx="26"
            cy="26"
            r="22"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct / 100)}
            strokeLinecap="round"
            transform="rotate(-90 26 26)"
            style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
          />
        </svg>
      )}
      <div
        style={{
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: "2.25rem",
          fontWeight: 900,
          letterSpacing: "-0.04em",
          color,
          marginBottom: "0.25rem",
        }}
      >
        {numericVal.toLocaleString()}
        {suffix}
      </div>
      <div
        style={{
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 13,
          fontWeight: 600,
          color: "#f0f4ff",
          marginBottom: "0.2rem",
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#6e82a4" }}>{sub}</div>
    </motion.div>
  );
};

export default StatCell;
