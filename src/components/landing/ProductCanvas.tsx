import { motion, useReducedMotion } from "framer-motion";
import { BookOpen, ChevronRight } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   Network animation — lives behind the ProductCanvas content.
   4 phases on mount: Awakening → Connection → Ordered flow → Calm loop.
   Respects prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════════════ */

interface NodeDef {
  id: string;
  x: number;
  y: number;
  primary?: boolean;
  endpoint?: boolean;
}

/* Positions are slightly asymmetric for organic feel */
const NODES: NodeDef[] = [
  { id: "src", x: 68,  y: 130, endpoint: true, primary: true },
  { id: "a",   x: 178, y: 72,  primary: true },
  { id: "b",   x: 168, y: 218 },
  { id: "c",   x: 316, y: 142, primary: true },
  { id: "d",   x: 296, y: 302 },
  { id: "e",   x: 442, y: 88,  primary: true },
  { id: "f",   x: 424, y: 244 },
  { id: "g",   x: 340, y: 378 },
  { id: "dst", x: 548, y: 148, endpoint: true, primary: true },
];

interface EdgeDef {
  from: string;
  to: string;
  primary?: boolean;
}

const EDGES: EdgeDef[] = [
  { from: "src", to: "a",   primary: true },
  { from: "src", to: "b" },
  { from: "a",   to: "c",   primary: true },
  { from: "b",   to: "c" },
  { from: "b",   to: "d" },
  { from: "c",   to: "e",   primary: true },
  { from: "c",   to: "f" },
  { from: "d",   to: "f" },
  { from: "d",   to: "g" },
  { from: "e",   to: "dst", primary: true },
  { from: "f",   to: "dst" },
];

const PRIMARY_ROUTE = ["src", "a", "c", "e", "dst"];
const routePoints = PRIMARY_ROUTE.map((id) => {
  const n = NODES.find((node) => node.id === id)!;
  return { x: n.x, y: n.y };
});

const nodeMap = Object.fromEntries(NODES.map((n) => [n.id, n]));

/* ——— Packet pulse ——— */
const Pulse = ({
  points,
  color,
  radius,
  delay,
  duration,
  repeatDelay,
}: {
  points: Array<{ x: number; y: number }>;
  color: string;
  radius: number;
  delay: number;
  duration: number;
  repeatDelay: number;
}) => {
  const times = points.map((_, i) =>
    points.length === 1 ? 0 : i / (points.length - 1),
  );

  return (
    <motion.circle
      r={radius}
      fill={color}
      initial={{ opacity: 0 }}
      animate={{
        cx: points.map((p) => p.x),
        cy: points.map((p) => p.y),
        opacity: points.map((_, i, arr) => {
          if (i === 0) return 0;
          if (i === arr.length - 1) return 0;
          return 0.75;
        }),
      }}
      transition={{
        duration,
        times,
        ease: "linear",
        delay,
        repeat: Infinity,
        repeatDelay,
      }}
      style={{ filter: `drop-shadow(0 0 5px ${color})` }}
    />
  );
};

/* ——— Full animation (continuous motion) ——— */
const AnimatedNetwork = () => (
  <svg
    viewBox="0 0 620 440"
    className="absolute inset-0 h-full w-full"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid slice"
  >
    {/* Edges — staggered fade-in, primary route brightens later */}
    {EDGES.map((edge, i) => {
      const a = nodeMap[edge.from];
      const b = nodeMap[edge.to];
      return (
        <motion.line
          key={`${edge.from}-${edge.to}`}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          strokeLinecap="round"
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            stroke: edge.primary
              ? "rgba(34,211,238,0.12)"
              : "rgba(255,255,255,0.035)",
            strokeWidth: edge.primary ? 1.2 : 0.7,
          }}
          transition={{
            opacity: {
              duration: 0.7,
              delay: 1.6 + i * 0.11,
              ease: "easeOut",
            },
            stroke: { duration: 1.4, delay: 3.0, ease: "easeOut" },
            strokeWidth: { duration: 1.4, delay: 3.0, ease: "easeOut" },
          }}
        />
      );
    })}

    {/* Nodes — staggered fade-in, primary nodes brighten */}
    {NODES.map((node, i) => {
      const r = node.endpoint ? 4.5 : 2.5;
      return (
        <motion.circle
          key={node.id}
          cx={node.x}
          cy={node.y}
          r={r}
          initial={{ opacity: 0 }}
          animate={{
            opacity: node.primary ? [0.7, 0.45, 0.7] : 1,
            fill: node.primary
              ? "rgba(34,211,238,0.3)"
              : "rgba(255,255,255,0.06)",
          }}
          transition={{
            opacity: node.primary
              ? {
                  duration: 5 + i * 0.4,
                  delay: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
              : { duration: 0.5, delay: 0.6 + i * 0.13, ease: "easeOut" },
            fill: { duration: 1.2, delay: 3.0, ease: "easeOut" },
          }}
        />
      );
    })}

    {/* Packet pulses — 2 forward, 1 reverse (ACK) */}
    <Pulse
      points={routePoints}
      color="rgba(103,232,249,0.8)"
      radius={3}
      delay={3.8}
      duration={3.0}
      repeatDelay={2.2}
    />
    <Pulse
      points={routePoints}
      color="rgba(56,189,248,0.6)"
      radius={2.4}
      delay={5.6}
      duration={3.2}
      repeatDelay={2.0}
    />
    <Pulse
      points={[...routePoints].reverse()}
      color="rgba(147,197,253,0.45)"
      radius={1.8}
      delay={6.0}
      duration={2.6}
      repeatDelay={2.8}
    />
  </svg>
);

/* ——— Static fallback (reduced motion) ——— */
const StaticNetwork = () => (
  <svg
    viewBox="0 0 620 440"
    className="absolute inset-0 h-full w-full"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid slice"
  >
    {EDGES.map((edge) => {
      const a = nodeMap[edge.from];
      const b = nodeMap[edge.to];
      return (
        <line
          key={`${edge.from}-${edge.to}`}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={
            edge.primary
              ? "rgba(34,211,238,0.12)"
              : "rgba(255,255,255,0.035)"
          }
          strokeWidth={edge.primary ? 1.2 : 0.7}
          strokeLinecap="round"
        />
      );
    })}
    {NODES.map((node) => (
      <circle
        key={node.id}
        cx={node.x}
        cy={node.y}
        r={node.endpoint ? 4.5 : 2.5}
        fill={
          node.primary
            ? "rgba(34,211,238,0.3)"
            : "rgba(255,255,255,0.06)"
        }
      />
    ))}
  </svg>
);

/* ═══════════════════════════════════════════════════════════════════
   Sidebar data
   ═══════════════════════════════════════════════════════════════════ */

const sidebarSections = [
  { label: "Application Layer", num: "01", active: false },
  { label: "Transport Layer",   num: "02", active: true },
  { label: "Network Layer",     num: "03", active: false },
  { label: "Link Layer",        num: "04", active: false },
  { label: "Network Security",  num: "05", active: false },
];

/* ═══════════════════════════════════════════════════════════════════
   ProductCanvas
   ═══════════════════════════════════════════════════════════════════ */

const ProductCanvas = () => {
  const prefersReduced = useReducedMotion();

  return (
    <div className="relative h-full min-h-[500px] w-full overflow-hidden rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(10,18,36,0.98),rgba(8,14,28,0.97))] shadow-[0_24px_80px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.03)]">
      {/* Top highlight line */}
      <div className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-white/[0.14] to-transparent" />

      {/* ——— App top bar ——— */}
      <div className="relative z-10 flex items-center gap-3 border-b border-white/[0.07] bg-white/[0.015] px-5 py-3.5">
        <div className="flex items-center gap-[7px]">
          <span className="h-[10px] w-[10px] rounded-full bg-white/[0.07] ring-1 ring-inset ring-white/[0.06]" />
          <span className="h-[10px] w-[10px] rounded-full bg-white/[0.07] ring-1 ring-inset ring-white/[0.06]" />
          <span className="h-[10px] w-[10px] rounded-full bg-white/[0.07] ring-1 ring-inset ring-white/[0.06]" />
        </div>

        <div className="h-4 w-px bg-white/[0.06]" />

        <div className="flex items-center gap-1">
          {[
            { label: "Chat", active: false },
            { label: "Course", active: true },
            { label: "Exam", active: false },
            { label: "Simulations", active: false },
          ].map((tab) => (
            <div
              key={tab.label}
              className={`rounded-md px-3 py-1.5 text-[11px] font-medium ${
                tab.active
                  ? "bg-cyan-400/[0.1] text-cyan-300/80 ring-1 ring-cyan-400/[0.14]"
                  : "text-white/35"
              }`}
            >
              {tab.label}
            </div>
          ))}
        </div>

        <div className="ml-auto hidden items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.025] px-2.5 py-1 sm:flex">
          <span className="h-[5px] w-[5px] rounded-full bg-emerald-400/70 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
          <span className="text-[9px] font-medium uppercase tracking-[0.15em] text-white/30">
            Connected
          </span>
        </div>
      </div>

      {/* ——— Content area ——— */}
      <div className="relative flex h-[calc(100%-48px)]">
        {/* Network animation layer */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          {prefersReduced ? <StaticNetwork /> : <AnimatedNetwork />}
        </div>

        {/* Sidebar */}
        <div className="relative z-10 hidden w-[172px] shrink-0 border-r border-white/[0.05] bg-[rgba(8,14,28,0.88)] backdrop-blur-sm sm:block">
          <div className="border-b border-white/[0.04] px-4 py-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/25">
              Sections
            </p>
          </div>

          <div className="space-y-0.5 px-2 pt-2">
            {sidebarSections.map((section, i) => (
              <motion.div
                key={section.num}
                initial={prefersReduced ? false : { opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.35,
                  delay: 0.55 + i * 0.06,
                  ease: "easeOut",
                }}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${
                  section.active
                    ? "bg-cyan-400/[0.06] ring-1 ring-cyan-400/[0.08]"
                    : ""
                }`}
              >
                <span
                  className={`text-[9px] font-semibold tabular-nums ${
                    section.active ? "text-cyan-400/60" : "text-white/15"
                  }`}
                >
                  {section.num}
                </span>
                <span
                  className={`text-[11px] font-medium leading-tight ${
                    section.active ? "text-white/60" : "text-white/25"
                  }`}
                >
                  {section.label}
                </span>
              </motion.div>
            ))}
          </div>

          <div className="mt-auto px-4 pt-6">
            <div className="rounded-lg border border-white/[0.04] bg-white/[0.015] px-3 py-2.5">
              <p className="text-[9px] font-medium uppercase tracking-[0.15em] text-white/20">
                Progress
              </p>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.04]">
                <motion.div
                  className="h-full rounded-full bg-cyan-400/40"
                  initial={prefersReduced ? { width: "38%" } : { width: 0 }}
                  animate={{ width: "38%" }}
                  transition={{ duration: 0.8, delay: 1.0, ease: "easeOut" }}
                />
              </div>
              <p className="mt-1.5 text-[9px] tabular-nums text-white/20">
                8 / 22 lessons
              </p>
            </div>
          </div>
        </div>

        {/* ——— Main content ——— */}
        <div className="relative z-10 flex-1 overflow-hidden p-5 sm:p-6">
          <motion.div
            initial={prefersReduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="flex items-center gap-1 text-[10px]"
          >
            <span className="text-white/20">Course</span>
            <ChevronRight className="h-2.5 w-2.5 text-white/15" />
            <span className="text-white/20">Transport Layer</span>
            <ChevronRight className="h-2.5 w-2.5 text-white/15" />
            <span className="text-cyan-300/50">TCP Reliability</span>
          </motion.div>

          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.7 }}
            className="mt-4"
          >
            <h3 className="font-display text-[15px] font-semibold tracking-tight text-white/70">
              TCP Reliable Data Transfer
            </h3>
            <p className="mt-1.5 text-[11px] leading-[1.6] text-white/30">
              Understanding how TCP guarantees in-order, error-free delivery
              over an unreliable network layer.
            </p>
          </motion.div>

          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.85 }}
            className="mt-5 rounded-xl border border-white/[0.06] bg-[rgba(8,14,28,0.82)] p-4 backdrop-blur-sm"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/[0.06] ring-1 ring-cyan-400/[0.1]">
                <BookOpen className="h-3.5 w-3.5 text-cyan-400/50" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-white/55">
                    Slide 14
                  </span>
                  <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[8px] font-medium uppercase tracking-[0.12em] text-white/25">
                    Lecture 6
                  </span>
                </div>
                <div className="mt-2.5 space-y-2">
                  <div className="h-2 w-[85%] rounded-full bg-white/[0.04]" />
                  <div className="h-2 w-[60%] rounded-full bg-white/[0.03]" />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.0 }}
            className="mt-4 flex gap-2"
          >
            {["Seq Numbers", "ACK", "Retransmission"].map((concept) => (
              <div
                key={concept}
                className="rounded-lg border border-white/[0.05] bg-[rgba(8,14,28,0.75)] px-3 py-2 backdrop-blur-sm"
              >
                <span className="text-[10px] font-medium text-white/30">
                  {concept}
                </span>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.1 }}
            className="mt-4 rounded-xl border border-white/[0.05] bg-[rgba(8,14,28,0.78)] p-4 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-white/25">
                AI Explanation
              </span>
              <span className="rounded-full bg-cyan-400/[0.06] px-2 py-0.5 text-[8px] font-medium text-cyan-300/40">
                Generated
              </span>
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-2 w-[90%] rounded-full bg-white/[0.03]" />
              <div className="h-2 w-[70%] rounded-full bg-white/[0.025]" />
              <div className="h-2 w-[80%] rounded-full bg-white/[0.02]" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom ambient gradient */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-20 bg-gradient-to-t from-[rgba(8,14,28,0.95)] to-transparent" />
    </div>
  );
};

export default ProductCanvas;
