import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

type NodeId = "client" | "a1" | "a2" | "b1" | "b2" | "core" | "server";

const NODES: Record<NodeId, { x: number; y: number; endpoint?: boolean }> = {
  client: { x: 88, y: 250, endpoint: true },
  a1: { x: 220, y: 120 },
  a2: { x: 228, y: 250 },
  b1: { x: 388, y: 140 },
  b2: { x: 396, y: 320 },
  core: { x: 544, y: 232 },
  server: { x: 666, y: 232, endpoint: true },
};

const EDGES: Array<[NodeId, NodeId]> = [
  ["client", "a1"],
  ["client", "a2"],
  ["a1", "b1"],
  ["a2", "b1"],
  ["a2", "b2"],
  ["b1", "core"],
  ["b2", "core"],
  ["core", "server"],
];

const ROUTES: NodeId[][] = [
  ["client", "a1", "b1", "core", "server"],
  ["client", "a2", "b1", "core", "server"],
  ["client", "a2", "b2", "core", "server"],
];

const PROTOCOL_TAGS = [
  { label: "TCP", className: "left-8 top-20" },
  { label: "Routing", className: "right-10 top-20" },
  { label: "DNS", className: "left-10 bottom-32" },
  { label: "ARP", className: "right-8 bottom-36" },
];

const buildKeyframeTimes = (length: number) =>
  Array.from({ length }, (_, index) => (length === 1 ? 0 : index / (length - 1)));

const edgeInRoute = (left: NodeId, right: NodeId, route: NodeId[]) => {
  for (let index = 0; index < route.length - 1; index += 1) {
    const current = route[index];
    const next = route[index + 1];
    if ((current === left && next === right) || (current === right && next === left)) {
      return true;
    }
  }

  return false;
};

interface MovingPulseProps {
  color: string;
  delay: number;
  duration: number;
  keyId: string;
  radius: number;
  points: Array<{ x: number; y: number }>;
}

const MovingPulse = ({ color, delay, duration, keyId, radius, points }: MovingPulseProps) => {
  const times = buildKeyframeTimes(points.length);

  return (
    <motion.circle
      key={keyId}
      r={radius}
      fill={color}
      initial={{ cx: points[0].x, cy: points[0].y, opacity: 0 }}
      animate={{
        cx: points.map((point) => point.x),
        cy: points.map((point) => point.y),
        opacity: points.map((_, index, array) => {
          if (index === 0 || index === array.length - 1) return 0;
          return 1;
        }),
      }}
      transition={{ duration, times, ease: "linear", delay }}
      style={{ filter: `drop-shadow(0 0 16px ${color})` }}
    />
  );
};

const HeroBadge = ({ active, label }: { active: boolean; label: string }) => (
  <div
    className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] transition-colors ${
      active
        ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.2)]"
        : "border-white/10 bg-white/[0.03] text-white/45"
    }`}
  >
    {label}
  </div>
);

const ProductRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
    <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/45">{label}</span>
    <span className="text-sm font-semibold text-white">{value}</span>
  </div>
);

const WindowCell = ({
  label,
  state,
}: {
  label: string;
  state: "acked" | "flight" | "queued";
}) => {
  const classes =
    state === "acked"
      ? "border-emerald-400/25 bg-emerald-400/15 text-emerald-200"
      : state === "flight"
        ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
        : "border-white/10 bg-white/[0.02] text-white/45";

  return (
    <div className={`rounded-xl border px-2 py-2 text-center text-[11px] font-semibold ${classes}`}>
      {label}
    </div>
  );
};

const NetworkHeroVisual = () => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTick((current) => current + 1);
    }, 900);

    return () => window.clearInterval(interval);
  }, []);

  const routeIndex = Math.floor(tick / 6) % ROUTES.length;
  const cycleKey = Math.floor(tick / 6);
  const handshakeStep = tick % 3;
  const windowStart = tick % 4;
  const activeRoute = ROUTES[routeIndex];

  const routePoints = useMemo(
    () => activeRoute.map((nodeId) => ({ x: NODES[nodeId].x, y: NODES[nodeId].y })),
    [activeRoute],
  );
  const reverseRoutePoints = useMemo(() => [...routePoints].reverse(), [routePoints]);

  return (
    <div className="relative h-full min-h-[460px] w-full overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(7,15,29,0.96),rgba(5,10,20,0.92))] shadow-[0_30px_120px_rgba(2,12,27,0.55)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(34,211,238,0.14),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_65%_75%,rgba(14,165,233,0.12),transparent_24%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />

      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
            Protocol Motion Layer
          </p>
          <p className="mt-2 text-sm font-medium text-white/55">
            TCP handshake, paced delivery, and route lock-in in one visual system
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.8)]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
            Live Fallback Visual
          </span>
        </div>
      </div>

      {PROTOCOL_TAGS.map((tag) => (
        <div
          key={tag.label}
          className={`absolute hidden rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50 lg:block ${tag.className}`}
        >
          {tag.label}
        </div>
      ))}

      <div className="absolute inset-x-0 top-20 bottom-0">
        <svg viewBox="0 0 740 520" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="landing-route-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {EDGES.map(([left, right]) => {
            const active = edgeInRoute(left, right, activeRoute);
            const leftNode = NODES[left];
            const rightNode = NODES[right];

            return (
              <motion.line
                key={`${left}-${right}`}
                x1={leftNode.x}
                y1={leftNode.y}
                x2={rightNode.x}
                y2={rightNode.y}
                strokeLinecap="round"
                animate={{
                  stroke: active ? "rgba(34,211,238,0.86)" : "rgba(255,255,255,0.08)",
                  strokeWidth: active ? 2.2 : 1.1,
                  opacity: active ? 1 : 0.9,
                }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                filter={active ? "url(#landing-route-glow)" : undefined}
              />
            );
          })}

          {Object.entries(NODES).map(([nodeId, node], index) => {
            const active = activeRoute.includes(nodeId as NodeId);
            const baseRadius = node.endpoint ? 8 : 4.5;
            const glowRadius = node.endpoint ? 18 : 11;

            return (
              <g key={nodeId}>
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r={glowRadius}
                  fill={active ? "rgba(34,211,238,0.18)" : "rgba(255,255,255,0.03)"}
                  animate={{
                    opacity: active ? [0.25, 0.55, 0.25] : [0.05, 0.12, 0.05],
                    scale: active ? [0.95, 1.08, 0.95] : [1, 1.03, 1],
                  }}
                  transition={{ duration: 2.8 + index * 0.15, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  animate={{
                    r: active ? baseRadius + 1.8 : baseRadius,
                    fill: active ? "#7dd3fc" : node.endpoint ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.16)",
                  }}
                  transition={{ duration: 0.35 }}
                  style={{ filter: active ? "drop-shadow(0 0 14px rgba(34,211,238,0.85))" : "none" }}
                />
              </g>
            );
          })}

          <MovingPulse
            keyId={`syn-${cycleKey}`}
            color="#67e8f9"
            delay={0.25}
            duration={1.1}
            radius={5}
            points={routePoints}
          />
          <MovingPulse
            keyId={`synack-${cycleKey}`}
            color="#93c5fd"
            delay={1.55}
            duration={1.1}
            radius={4}
            points={reverseRoutePoints}
          />
          <MovingPulse
            keyId={`ack-${cycleKey}`}
            color="#22d3ee"
            delay={2.8}
            duration={1.05}
            radius={4.5}
            points={routePoints}
          />
          <MovingPulse
            keyId={`data-1-${cycleKey}`}
            color="#38bdf8"
            delay={3.7}
            duration={1.15}
            radius={3.6}
            points={routePoints}
          />
          <MovingPulse
            keyId={`data-2-${cycleKey}`}
            color="#38bdf8"
            delay={4.25}
            duration={1.15}
            radius={3.1}
            points={routePoints}
          />

          <text
            x={68}
            y={282}
            textAnchor="middle"
            fontSize="11"
            fontFamily="monospace"
            fill="rgba(255,255,255,0.38)"
            letterSpacing="1.8"
          >
            CLIENT
          </text>
          <text
            x={680}
            y={264}
            textAnchor="middle"
            fontSize="11"
            fontFamily="monospace"
            fill="rgba(255,255,255,0.38)"
            letterSpacing="1.8"
          >
            SERVER
          </text>
        </svg>
      </div>

      <div className="absolute left-6 top-24 flex flex-wrap gap-2">
        <HeroBadge active={handshakeStep === 0} label="SYN" />
        <HeroBadge active={handshakeStep === 1} label="SYN-ACK" />
        <HeroBadge active={handshakeStep === 2} label="ACK" />
      </div>

      <div className="absolute bottom-6 left-6 w-[min(52%,320px)] rounded-[24px] border border-white/10 bg-[#06101f]/90 p-4 shadow-[0_20px_60px_rgba(2,12,27,0.4)] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
              Paced Packet Flow
            </p>
            <p className="mt-1 text-sm text-white/60">Sliding window grows only after reliable acknowledgments.</p>
          </div>
          <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-100">
            ACK {windowStart + 4}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }, (_, index) => {
            const state =
              index < windowStart
                ? "acked"
                : index < windowStart + 4
                  ? "flight"
                  : "queued";

            return <WindowCell key={index} label={`${index + 1}`} state={state} />;
          })}
        </div>
      </div>

      <div className="absolute bottom-6 right-6 w-[min(42%,260px)] rounded-[24px] border border-white/10 bg-white/[0.045] p-4 backdrop-blur">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">Product Clarity</p>
        <div className="mt-3 space-y-3">
          <ProductRow label="Chat" value="Course-grounded answers" />
          <ProductRow label="Course" value="11 sections / 22 lessons" />
          <ProductRow label="Simulations" value="17 interactive visuals" />
          <ProductRow label="Practice" value="Mock exam generation" />
        </div>
      </div>
    </div>
  );
};

export default NetworkHeroVisual;
