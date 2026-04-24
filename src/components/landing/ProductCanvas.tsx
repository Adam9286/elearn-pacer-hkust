import { motion, useReducedMotion } from "framer-motion";
import { Cpu, TrendingUp } from "lucide-react";

type NodeDef = {
  id: string;
  x: number;
  y: number;
  route?: "blue" | "orange";
  large?: boolean;
};

type EdgeDef = {
  from: string;
  to: string;
  route?: "blue" | "orange";
  dim?: boolean;
};

const nodes: NodeDef[] = [
  { id: "a", x: 88, y: 186, route: "blue" },
  { id: "b", x: 170, y: 118, route: "blue" },
  { id: "c", x: 176, y: 262, route: "blue" },
  { id: "d", x: 278, y: 154, route: "blue", large: true },
  { id: "e", x: 274, y: 316, route: "blue" },
  { id: "f", x: 372, y: 88, route: "blue" },
  { id: "g", x: 374, y: 205, route: "blue", large: true },
  { id: "h", x: 370, y: 358, route: "blue" },
  { id: "i", x: 474, y: 122, route: "blue" },
  { id: "j", x: 478, y: 254, route: "orange", large: true },
  { id: "k", x: 570, y: 88, route: "blue" },
  { id: "l", x: 584, y: 174, route: "orange", large: true },
  { id: "m", x: 584, y: 308, route: "orange" },
  { id: "n", x: 678, y: 136, route: "blue" },
  { id: "o", x: 686, y: 250, route: "blue" },
];

const edges: EdgeDef[] = [
  { from: "a", to: "b", route: "blue" },
  { from: "a", to: "c", route: "blue" },
  { from: "a", to: "d", route: "blue", dim: true },
  { from: "b", to: "d", route: "blue" },
  { from: "b", to: "f", route: "blue" },
  { from: "b", to: "g", route: "blue", dim: true },
  { from: "c", to: "d", route: "blue" },
  { from: "c", to: "e", route: "blue" },
  { from: "c", to: "g", route: "blue", dim: true },
  { from: "d", to: "f", route: "blue" },
  { from: "d", to: "g", route: "blue" },
  { from: "d", to: "i", route: "blue" },
  { from: "d", to: "e", route: "blue", dim: true },
  { from: "e", to: "g", route: "blue" },
  { from: "e", to: "h", route: "blue" },
  { from: "e", to: "j", route: "orange", dim: true },
  { from: "f", to: "i", route: "blue" },
  { from: "f", to: "k", route: "blue" },
  { from: "f", to: "g", route: "blue", dim: true },
  { from: "g", to: "i", route: "blue" },
  { from: "g", to: "j", route: "orange" },
  { from: "g", to: "l", route: "orange" },
  { from: "g", to: "h", route: "blue", dim: true },
  { from: "h", to: "j", route: "blue" },
  { from: "h", to: "m", route: "orange" },
  { from: "i", to: "k", route: "blue" },
  { from: "i", to: "l", route: "orange" },
  { from: "i", to: "n", route: "blue", dim: true },
  { from: "j", to: "l", route: "orange" },
  { from: "j", to: "m", route: "orange" },
  { from: "j", to: "o", route: "blue", dim: true },
  { from: "k", to: "n", route: "blue" },
  { from: "k", to: "l", route: "blue", dim: true },
  { from: "l", to: "n", route: "blue" },
  { from: "l", to: "o", route: "orange" },
  { from: "m", to: "o", route: "orange" },
];

const nodeMap = Object.fromEntries(nodes.map((node) => [node.id, node]));

const ambientDots = [
  [92, 92, 2.1], [122, 146, 1.6], [154, 70, 1.8], [208, 104, 1.5], [232, 214, 1.8],
  [250, 56, 1.2], [308, 120, 1.9], [326, 264, 1.4], [338, 42, 1.2], [410, 72, 1.6],
  [418, 162, 1.8], [446, 44, 1.2], [506, 86, 1.7], [534, 236, 1.4], [556, 54, 1.3],
  [618, 122, 1.8], [644, 92, 1.3], [696, 188, 1.7], [628, 294, 1.2], [468, 336, 1.8],
  [288, 362, 1.5], [144, 334, 1.4], [84, 250, 1.2], [702, 64, 1.2], [734, 134, 1.1],
  [60, 142, 1.2], [50, 300, 1.4], [728, 290, 1.3], [738, 204, 1.1], [352, 42, 1.1],
  [102, 398, 1.1], [212, 388, 0.9], [396, 388, 1.0], [562, 382, 0.9], [672, 388, 1.1],
  [42, 76, 0.8], [46, 224, 0.9], [745, 256, 0.8], [746, 354, 0.9], [430, 402, 0.8],
];

const latticeLines = [
  { x1: 86, y1: 98, x2: 218, y2: 160 },
  { x1: 196, y1: 70, x2: 332, y2: 120 },
  { x1: 252, y1: 208, x2: 406, y2: 170 },
  { x1: 438, y1: 58, x2: 594, y2: 114 },
  { x1: 534, y1: 214, x2: 718, y2: 172 },
  { x1: 240, y1: 334, x2: 408, y2: 294 },
  { x1: 76, y1: 382, x2: 228, y2: 356 },
  { x1: 486, y1: 364, x2: 640, y2: 340 },
];

const bluePulse = ["a", "b", "d", "g", "i", "k", "n"].map((id) => nodeMap[id]);
const orangePulse = ["g", "j", "l", "m", "o"].map((id) => nodeMap[id]);
const secondaryBluePulse = ["c", "e", "h", "j", "l", "n"].map((id) => nodeMap[id]);

function Pulse({
  points,
  color,
  duration,
  delay,
  radius,
}: {
  points: NodeDef[];
  color: string;
  duration: number;
  delay: number;
  radius: number;
}) {
  return (
    <motion.circle
      r={radius}
      fill={color}
      animate={{
        cx: points.map((point) => point.x),
        cy: points.map((point) => point.y),
        opacity: [0, 0.96, 0.76, 0],
      }}
      transition={{
        duration,
        delay,
        ease: "linear",
        repeat: Infinity,
        repeatDelay: 1.1,
      }}
      style={{ filter: `drop-shadow(0 0 16px ${color}) drop-shadow(0 0 6px ${color})` }}
    />
  );
}

function RouterNode({
  node,
  shouldReduceMotion,
  delay,
}: {
  node: NodeDef;
  shouldReduceMotion: boolean;
  delay: number;
}) {
  const stroke =
    node.route === "orange"
      ? "rgba(253,186,116,1)"
      : "rgba(165,243,252,0.98)";
  const fill =
    node.route === "orange"
      ? "rgba(96,42,12,0.96)"
      : "rgba(16,46,80,0.98)";
  const glow =
    node.route === "orange"
      ? "drop-shadow(0 0 32px rgba(251,146,60,0.62)) drop-shadow(0 0 14px rgba(251,146,60,0.42))"
      : "drop-shadow(0 0 30px rgba(34,211,238,0.48)) drop-shadow(0 0 12px rgba(56,189,248,0.32))";
  const r = node.large ? 19 : 15;
  const coreColor =
    node.route === "orange"
      ? "rgba(253,186,116,0.95)"
      : "rgba(165,243,252,0.92)";

  return (
    <g>
      {!shouldReduceMotion && (
        <>
          <motion.circle
            cx={node.x}
            cy={node.y}
            r={node.large ? 44 : 34}
            fill={node.route === "orange" ? "rgba(251,146,60,0.12)" : "rgba(34,211,238,0.1)"}
            animate={{ opacity: [0.12, 0.28, 0.12], scale: [0.88, 1.14, 0.88] }}
            transition={{ duration: 4.6, delay, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: `${node.x}px ${node.y}px` }}
          />
          <motion.circle
            cx={node.x}
            cy={node.y}
            r={node.large ? 28 : 22}
            fill={node.route === "orange" ? "rgba(251,146,60,0.18)" : "rgba(34,211,238,0.16)"}
            animate={{ opacity: [0.18, 0.36, 0.18], scale: [0.92, 1.08, 0.92] }}
            transition={{ duration: 3.8, delay: delay + 0.2, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: `${node.x}px ${node.y}px` }}
          />
          <motion.circle
            cx={node.x}
            cy={node.y + 14}
            r={node.large ? 19 : 16}
            fill="rgba(2,8,23,0.5)"
            animate={{ opacity: [0.2, 0.42, 0.2], scale: [1, 1.12, 1] }}
            transition={{ duration: 3.9, delay, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: `${node.x}px ${node.y + 14}px` }}
          />
        </>
      )}
      <ellipse
        cx={node.x}
        cy={node.y + 13}
        rx={r + 1}
        ry={6}
        fill="rgba(3,12,26,0.82)"
        opacity="0.76"
      />
      <motion.circle
        cx={node.x}
        cy={node.y}
        r={r + 2}
        fill="none"
        stroke={node.route === "orange" ? "rgba(251,146,60,0.3)" : "rgba(56,189,248,0.24)"}
        strokeWidth={1}
        initial={shouldReduceMotion ? { opacity: 0.4 } : { opacity: 0 }}
        animate={shouldReduceMotion ? { opacity: 0.4 } : { opacity: [0, 0.6, 0.2] }}
        transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.circle
        cx={node.x}
        cy={node.y}
        r={r}
        fill="rgba(8,23,43,0.98)"
        stroke={stroke}
        strokeWidth={2.2}
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.84 }}
        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
        style={{ filter: glow, transformOrigin: `${node.x}px ${node.y}px` }}
      />
      <circle cx={node.x} cy={node.y} r={r - 4.3} fill={fill} />
      <circle cx={node.x} cy={node.y - 5.5} r={r - 8} fill="rgba(255,255,255,0.1)" />
      {!shouldReduceMotion && (
        <motion.circle
          cx={node.x}
          cy={node.y}
          r={1.6}
          fill={coreColor}
          animate={{ opacity: [0.65, 1, 0.65], scale: [0.9, 1.3, 0.9] }}
          transition={{ duration: 2.1, delay: delay + 0.3, repeat: Infinity, ease: "easeInOut" }}
          style={{
            filter: `drop-shadow(0 0 6px ${coreColor})`,
            transformOrigin: `${node.x}px ${node.y}px`,
          }}
        />
      )}
      <path
        d={`M ${node.x - 5} ${node.y + 2} L ${node.x - 1} ${node.y - 4} L ${node.x + 5} ${node.y - 1} L ${node.x + 1} ${node.y + 5} Z`}
        fill="rgba(255,255,255,0.88)"
      />
      <path
        d={`M ${node.x - 7} ${node.y - 8} Q ${node.x} ${node.y - 13} ${node.x + 8} ${node.y - 8}`}
        fill="none"
        stroke="rgba(255,255,255,0.32)"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </g>
  );
}

export default function ProductCanvas() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative h-full min-h-[470px] overflow-hidden lg:min-h-[590px]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_48%,rgba(15,38,78,0.64),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_44%_42%,rgba(34,211,238,0.26),transparent_32%),radial-gradient(circle_at_70%_58%,rgba(249,115,22,0.24),transparent_28%),radial-gradient(circle_at_78%_16%,rgba(37,99,235,0.28),transparent_30%),radial-gradient(circle_at_18%_76%,rgba(14,165,233,0.14),transparent_24%)]" />
        <div className="absolute inset-x-0 top-0 h-52 bg-[linear-gradient(180deg,rgba(37,99,235,0.12),transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(0deg,rgba(2,8,23,0.62),transparent)]" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:radial-gradient(rgba(148,163,184,0.5)_0.6px,transparent_0.6px)] [background-size:18px_18px]" />
        <div className="absolute left-[8%] top-[4%] h-[20rem] w-[20rem] rounded-full bg-cyan-400/[0.18] blur-3xl" />
        <div className="absolute right-[2%] top-[2%] h-[26rem] w-[26rem] rounded-full bg-blue-500/[0.22] blur-3xl" />
        <div className="absolute right-[12%] top-[40%] h-[18rem] w-[18rem] rounded-full bg-orange-400/[0.22] blur-3xl" />
        <div className="absolute left-[18%] bottom-[6%] h-[15rem] w-[15rem] rounded-full bg-sky-500/[0.12] blur-3xl" />
        <div className="absolute left-[46%] top-[30%] h-[11rem] w-[11rem] rounded-full bg-cyan-300/[0.1] blur-3xl" />
      </div>

      <div className="pointer-events-none absolute inset-0">
        {!shouldReduceMotion &&
          [
            { left: "14%", top: "18%", width: 130, delay: 0.3, rotation: -16 },
            { left: "42%", top: "14%", width: 168, delay: 1.2, rotation: 12 },
            { left: "60%", top: "32%", width: 108, delay: 1.7, rotation: -8 },
            { left: "70%", top: "58%", width: 138, delay: 0.8, rotation: -22 },
            { left: "22%", top: "54%", width: 96, delay: 1.9, rotation: -10 },
            { left: "50%", top: "72%", width: 118, delay: 2.4, rotation: -14 },
            { left: "32%", top: "38%", width: 88, delay: 3.1, rotation: 6 },
            { left: "66%", top: "74%", width: 96, delay: 2.8, rotation: -18 },
          ].map((streak) => (
            <motion.div
              key={`${streak.left}-${streak.top}`}
              className="absolute h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent"
              style={{
                left: streak.left,
                top: streak.top,
                width: streak.width,
                transform: `rotate(${streak.rotation}deg)`,
              }}
              animate={{ opacity: [0, 0.95, 0], x: [-10, 18, 28] }}
              transition={{
                duration: 4.6,
                delay: streak.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
      </div>

      <div className="absolute left-4 top-9 z-20 rounded-[14px] border border-white/12 bg-[#0a1628]/88 px-3.5 py-2.5 shadow-[0_12px_36px_rgba(2,8,23,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl lg:left-5 lg:top-10">
        <div className="flex items-center gap-1.5 text-[11px] text-white/48">
          <Cpu className="h-3 w-3 text-cyan-300/80" />
          TCP Flow
        </div>
        <p className="mt-1.5 text-[12.5px] font-semibold text-white/94">SYN → ACK</p>
        <div className="mt-2 h-7 w-24 overflow-hidden rounded-md border border-white/10 bg-white/[0.025] px-1.5 py-1">
          <svg viewBox="0 0 96 24" className="w-full" aria-hidden="true">
            <motion.path
              d="M2 18 L18 16 L30 17 L42 13 L54 14 L66 9 L78 10 L92 5"
              fill="none"
              stroke="rgba(103,232,249,0.98)"
              strokeWidth="1.9"
              strokeLinecap="round"
              initial={shouldReduceMotion ? { opacity: 1 } : { pathLength: 0, opacity: 0.4 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.35, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
              style={{ filter: "drop-shadow(0 0 5px rgba(103,232,249,0.65))" }}
            />
          </svg>
        </div>
      </div>

      <div className="absolute right-3 top-4 z-20 rounded-[14px] border border-white/12 bg-[#0a1628]/88 px-3.5 py-2.5 shadow-[0_12px_36px_rgba(2,8,23,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl lg:right-6 lg:top-6">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/90 shadow-[0_0_8px_rgba(103,232,249,0.8)]" />
          <p className="text-[12.5px] font-semibold text-cyan-100/95">Packet #2041</p>
        </div>
        <p className="mt-1 text-[12px] text-white/76">192.168.1.1 → 10.0.0.5</p>
        <p className="mt-0.5 text-[11px] text-white/44">TTL: 37 · 8 hops</p>
      </div>

      <div className="absolute bottom-20 left-6 z-20 rounded-[14px] border border-white/12 bg-[#0a1628]/88 px-3.5 py-2.5 shadow-[0_12px_36px_rgba(2,8,23,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
        <div className="flex items-center gap-1.5 text-[11px] text-white/48">
          <TrendingUp className="h-3 w-3 text-cyan-300/80" />
          Throughput
        </div>
        <p className="mt-1.5 text-[12.5px] font-semibold text-white/94">92.3 Mbps</p>
        <div className="mt-2 h-7 w-24 overflow-hidden rounded-md border border-white/10 bg-white/[0.025] px-1.5 py-1">
          <svg viewBox="0 0 96 24" className="w-full" aria-hidden="true">
            <motion.path
              d="M2 18 L14 19 L24 14 L34 16 L42 10 L52 12 L64 8 L76 11 L92 4"
              fill="none"
              stroke="rgba(96,165,250,0.98)"
              strokeWidth="1.9"
              strokeLinecap="round"
              initial={shouldReduceMotion ? { opacity: 1 } : { pathLength: 0, opacity: 0.4 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.35, delay: 0.92, ease: [0.22, 1, 0.36, 1] }}
              style={{ filter: "drop-shadow(0 0 5px rgba(96,165,250,0.65))" }}
            />
          </svg>
        </div>
      </div>

      <div className="absolute bottom-8 right-7 z-20 rounded-[14px] border border-emerald-400/22 bg-[#0a1628]/88 px-3.5 py-2.5 shadow-[0_12px_36px_rgba(2,8,23,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
        <div className="flex items-center gap-2 text-[12.5px] font-semibold text-white/88">
          <span className="relative flex h-2.5 w-2.5 items-center justify-center">
            <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-emerald-400/55" />
            <span className="relative h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(74,222,128,0.92)]" />
          </span>
          Live Simulation
        </div>
      </div>

      <svg
        viewBox="0 0 760 430"
        className="relative z-10 h-full w-full scale-[1.03]"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <filter id="softBlueGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="softOrangeGlow">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(37,99,235,0.22)" />
            <stop offset="40%" stopColor="rgba(37,99,235,0.08)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="orangeVignette" cx="64%" cy="56%" r="30%">
            <stop offset="0%" stopColor="rgba(249,115,22,0.15)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <linearGradient id="blueEdgeGlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(56,189,248,0.55)" />
            <stop offset="50%" stopColor="rgba(125,211,252,0.9)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0.55)" />
          </linearGradient>
          <linearGradient id="orangeEdgeGlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(251,146,60,0.65)" />
            <stop offset="50%" stopColor="rgba(253,186,116,0.98)" />
            <stop offset="100%" stopColor="rgba(251,146,60,0.65)" />
          </linearGradient>
        </defs>

        <ellipse cx="400" cy="220" rx="340" ry="200" fill="url(#centerGlow)" />
        <ellipse cx="486" cy="238" rx="200" ry="130" fill="url(#orangeVignette)" />

        {latticeLines.map((line, index) => (
          <line
            key={`lattice-${index}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="rgba(148,163,184,0.1)"
            strokeWidth="1"
            strokeDasharray="3 5"
          />
        ))}

        {ambientDots.map(([x, y, r], index) => (
          <motion.circle
            key={`dot-${index}`}
            cx={x}
            cy={y}
            r={r}
            fill="rgba(125,211,252,0.72)"
            animate={shouldReduceMotion ? { opacity: 0.55 } : { opacity: [0.22, 0.82, 0.22] }}
            transition={{ duration: 3.4 + (index % 5) * 0.5, delay: index * 0.06, repeat: Infinity }}
            style={{ filter: "drop-shadow(0 0 4px rgba(125,211,252,0.65))" }}
          />
        ))}

        {edges.map((edge, index) => {
          const from = nodeMap[edge.from];
          const to = nodeMap[edge.to];
          const active = edge.route === "orange";
          const stroke = active ? "url(#orangeEdgeGlow)" : "url(#blueEdgeGlow)";
          const glowStroke = active ? "rgba(251,146,60,0.5)" : "rgba(56,189,248,0.34)";
          const baseStroke = edge.dim
            ? "rgba(148,163,184,0.1)"
            : active
              ? "rgba(251,146,60,0.2)"
              : "rgba(148,163,184,0.16)";

          return (
            <g key={`${edge.from}-${edge.to}`}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={baseStroke}
                strokeWidth={edge.dim ? 0.9 : 1.3}
                strokeLinecap="round"
              />
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={glowStroke}
                strokeWidth={active ? 6.4 : 4.8}
                strokeLinecap="round"
                opacity={edge.dim ? 0.22 : 0.76}
                filter={active ? "url(#softOrangeGlow)" : "url(#softBlueGlow)"}
              />
              <motion.line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={stroke}
                strokeWidth={active ? 2.8 : edge.dim ? 1.4 : 2}
                strokeLinecap="round"
                initial={shouldReduceMotion ? { opacity: 1 } : { pathLength: 0, opacity: 0 }}
                animate={
                  shouldReduceMotion
                    ? { opacity: active ? 1 : edge.dim ? 0.45 : 0.9 }
                    : { pathLength: 1, opacity: active ? 1 : edge.dim ? 0.42 : 0.94 }
                }
                transition={{
                  duration: active ? 1.2 : 1.02,
                  delay: 0.12 + index * 0.014,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  filter: active
                    ? "drop-shadow(0 0 14px rgba(251,146,60,0.65))"
                    : "drop-shadow(0 0 9px rgba(56,189,248,0.42))",
                }}
              />
            </g>
          );
        })}

        {nodes.map((node, index) => (
          <RouterNode
            key={node.id}
            node={node}
            shouldReduceMotion={shouldReduceMotion}
            delay={0.14 + index * 0.03}
          />
        ))}

        {!shouldReduceMotion && (
          <>
            <Pulse
              points={bluePulse}
              color="rgba(125,243,255,0.98)"
              duration={3.2}
              delay={1.1}
              radius={4.4}
            />
            <Pulse
              points={secondaryBluePulse}
              color="rgba(96,165,250,0.9)"
              duration={3.8}
              delay={1.6}
              radius={3.6}
            />
            <Pulse
              points={orangePulse}
              color="rgba(253,186,116,1)"
              duration={2.6}
              delay={0.92}
              radius={5.2}
            />
          </>
        )}
      </svg>
    </div>
  );
}
