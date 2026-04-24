import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRightLeft, Radio, TrendingUp } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

type Point = { x: number; y: number };
type Node = { id: string; x: number; y: number };
type Edge = [string, string];

const DESKTOP_NODES: Node[] = [
  { id: "N1", x: 140, y: 110 },
  { id: "N2", x: 340, y: 90 },
  { id: "N3", x: 550, y: 110 },
  { id: "N4", x: 720, y: 130 },
  { id: "N5", x: 70, y: 220 },
  { id: "N6", x: 260, y: 200 },
  { id: "N7", x: 460, y: 185 },
  { id: "N8", x: 650, y: 215 },
  { id: "N9", x: 160, y: 315 },
  { id: "N10", x: 380, y: 300 },
  { id: "N11", x: 590, y: 320 },
  { id: "N14", x: 470, y: 420 },
];

const DESKTOP_EDGES: Edge[] = [
  ["N1", "N2"], ["N2", "N3"],
  ["N5", "N6"], ["N6", "N7"], ["N7", "N8"],
  ["N9", "N10"], ["N10", "N11"],
  ["N1", "N5"], ["N2", "N6"], ["N4", "N8"],
  ["N6", "N9"], ["N8", "N11"],
  ["N9", "N14"], ["N10", "N14"], ["N11", "N14"],
  ["N2", "N7"], ["N3", "N10"],
];

const DESKTOP_ACTIVE_IDS = ["N5", "N10", "N7", "N3", "N4"];
const DESKTOP_BREATHING_IDS = ["N1", "N8", "N9"];

const TABLET_NODES: Node[] = [
  { id: "N2", x: 340, y: 90 },
  { id: "N3", x: 550, y: 110 },
  { id: "N5", x: 70, y: 220 },
  { id: "N6", x: 260, y: 200 },
  { id: "N7", x: 460, y: 185 },
  { id: "N10", x: 380, y: 300 },
  { id: "N11", x: 590, y: 320 },
];

const TABLET_EDGES: Edge[] = [
  ["N2", "N3"], ["N5", "N6"], ["N6", "N7"],
  ["N2", "N6"], ["N2", "N7"], ["N3", "N10"],
  ["N10", "N11"],
];

const TABLET_ACTIVE_IDS = ["N5", "N10", "N7", "N3"];
const TABLET_BREATHING_IDS = ["N2", "N11"];

const MOBILE_NODES: Node[] = [
  { id: "M1", x: 320, y: 60 },
  { id: "M2", x: 230, y: 150 },
  { id: "M3", x: 170, y: 250 },
  { id: "M4", x: 80, y: 340 },
];

const MOBILE_ACTIVE_IDS = ["M1", "M2", "M3", "M4"];

const COOL_STROKE = "rgba(165,243,252,0.4)";
const WARM_STROKE = "#FB923C";

function nodeMap(nodes: Node[]): Map<string, Node> {
  return new Map(nodes.map((n) => [n.id, n]));
}

function pathD(points: Point[]): string {
  if (points.length === 0) return "";
  const [head, ...rest] = points;
  return `M ${head.x} ${head.y} ` + rest.map((p) => `L ${p.x} ${p.y}`).join(" ");
}

function SharedDefs() {
  return (
    <defs>
      <pattern id="hero-iso-dots" width="24" height="24" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="0.9" fill="white" opacity="0.08" />
      </pattern>

      <filter id="hero-glow-cool" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="2.2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <filter id="hero-glow-warm" x="-70%" y="-70%" width="240%" height="240%">
        <feGaussianBlur stdDeviation="3.4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <linearGradient id="hero-top-cool" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="rgba(165,243,252,0.52)" />
        <stop offset="100%" stopColor="rgba(165,243,252,0.18)" />
      </linearGradient>
      <linearGradient id="hero-top-warm" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="rgba(253,224,71,0.85)" />
        <stop offset="100%" stopColor="rgba(251,146,60,0.45)" />
      </linearGradient>

      <symbol id="hero-router-cool" viewBox="0 0 32 32">
        <polygon
          points="16,4 28,10 16,16 4,10"
          fill="url(#hero-top-cool)"
          stroke="rgba(165,243,252,0.9)"
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
        <polygon
          points="4,10 16,16 16,26 4,20"
          fill="rgba(14,40,72,0.95)"
          stroke="rgba(103,200,220,0.7)"
          strokeWidth="0.6"
          strokeLinejoin="round"
        />
        <polygon
          points="16,16 28,10 28,20 16,26"
          fill="rgba(22,58,96,0.95)"
          stroke="rgba(103,200,220,0.7)"
          strokeWidth="0.6"
          strokeLinejoin="round"
        />
        <rect
          x="11"
          y="26"
          width="10"
          height="2.6"
          rx="0.8"
          fill="rgba(16,46,80,0.92)"
          stroke="rgba(103,200,220,0.55)"
          strokeWidth="0.5"
        />
      </symbol>

      <symbol id="hero-router-warm" viewBox="0 0 32 32">
        <polygon
          points="16,4 28,10 16,16 4,10"
          fill="url(#hero-top-warm)"
          stroke="rgba(253,186,116,1)"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
        <polygon
          points="4,10 16,16 16,26 4,20"
          fill="rgba(72,32,12,0.96)"
          stroke="rgba(251,146,60,0.85)"
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
        <polygon
          points="16,16 28,10 28,20 16,26"
          fill="rgba(96,42,12,0.96)"
          stroke="rgba(251,146,60,0.85)"
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
        <rect
          x="11"
          y="26"
          width="10"
          height="2.6"
          rx="0.8"
          fill="rgba(72,32,12,0.94)"
          stroke="rgba(251,146,60,0.7)"
          strokeWidth="0.5"
        />
      </symbol>
    </defs>
  );
}

function RouterUse({ node, active }: { node: Node; active: boolean }) {
  const href = active ? "#hero-router-warm" : "#hero-router-cool";
  const filter = active ? "url(#hero-glow-warm)" : "url(#hero-glow-cool)";
  return (
    <g filter={filter}>
      <use href={href} x={node.x - 16} y={node.y - 16} width={32} height={32} />
    </g>
  );
}

function BreathingRouter({
  node,
  delay,
  duration,
  reduceMotion,
}: {
  node: Node;
  delay: number;
  duration: number;
  reduceMotion: boolean;
}) {
  if (reduceMotion) {
    return <RouterUse node={node} active={false} />;
  }
  return (
    <motion.g
      filter="url(#hero-glow-cool)"
      animate={{ opacity: [0.55, 1, 0.55] }}
      transition={{ duration, delay, ease: "easeInOut", repeat: Infinity }}
    >
      <use
        href="#hero-router-cool"
        x={node.x - 16}
        y={node.y - 16}
        width={32}
        height={32}
      />
    </motion.g>
  );
}

function Packet({ points, reduceMotion }: { points: Point[]; reduceMotion: boolean }) {
  if (points.length < 2) return null;
  const mid = points[Math.floor(points.length / 2)];

  if (reduceMotion) {
    return (
      <g>
        <circle cx={mid.x} cy={mid.y} r={9} fill="rgba(251,146,60,0.28)" />
        <circle cx={mid.x} cy={mid.y} r={4.2} fill="#FCD34D" stroke="#FB923C" strokeWidth={1} />
      </g>
    );
  }

  const cx = points.map((p) => p.x);
  const cy = points.map((p) => p.y);
  const transition = { duration: 3, ease: "linear", repeat: Infinity } as const;

  return (
    <g>
      <motion.circle
        r={9}
        fill="rgba(251,146,60,0.32)"
        animate={{ cx, cy }}
        transition={transition}
      />
      <motion.circle
        r={4.2}
        fill="#FCD34D"
        stroke="#FB923C"
        strokeWidth={1}
        animate={{ cx, cy }}
        transition={transition}
      />
    </g>
  );
}

type MeshProps = {
  nodes: Node[];
  edges: Edge[];
  activeIds: string[];
  breathingIds: string[];
  viewBox: string;
  className?: string;
  reduceMotion: boolean;
};

function Mesh({
  nodes,
  edges,
  activeIds,
  breathingIds,
  viewBox,
  className,
  reduceMotion,
}: MeshProps) {
  const map = useMemo(() => nodeMap(nodes), [nodes]);
  const activeSet = useMemo(() => new Set(activeIds), [activeIds]);
  const breathingSet = useMemo(() => new Set(breathingIds), [breathingIds]);

  const activePoints = useMemo(
    () =>
      activeIds
        .map((id) => map.get(id))
        .filter((n): n is Node => Boolean(n))
        .map((n) => ({ x: n.x, y: n.y })),
    [activeIds, map],
  );
  const activePathD = useMemo(() => pathD(activePoints), [activePoints]);

  const pathRef = useRef<SVGPathElement | null>(null);
  const [sampled, setSampled] = useState<Point[]>([]);

  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const len = el.getTotalLength();
    if (len === 0) return;
    const SAMPLE_COUNT = 30;
    const next: Point[] = [];
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const p = el.getPointAtLength((i / (SAMPLE_COUNT - 1)) * len);
      next.push({ x: p.x, y: p.y });
    }
    setSampled(next);
  }, [activePathD]);

  const breathingDurations = [2.4, 3.1, 3.8];
  const breathingDelays = [0, 0.7, 1.4];

  return (
    <svg
      viewBox={viewBox}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Animated network routing illustration"
    >
      <SharedDefs />

      <rect x="0" y="0" width="100%" height="100%" fill="url(#hero-iso-dots)" />

      <g>
        {edges.map(([a, b]) => {
          const na = map.get(a);
          const nb = map.get(b);
          if (!na || !nb) return null;
          return (
            <line
              key={`${a}-${b}`}
              x1={na.x}
              y1={na.y}
              x2={nb.x}
              y2={nb.y}
              stroke={COOL_STROKE}
              strokeWidth={1}
              strokeLinecap="round"
            />
          );
        })}
      </g>

      <path
        ref={pathRef}
        id="hero-active-path"
        d={activePathD}
        fill="none"
        stroke={WARM_STROKE}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.95}
      />

      <g>
        {nodes.map((n, i) => {
          const active = activeSet.has(n.id);
          if (active) return <RouterUse key={n.id} node={n} active />;
          if (breathingSet.has(n.id)) {
            const idx = [...breathingSet].indexOf(n.id);
            return (
              <BreathingRouter
                key={n.id}
                node={n}
                delay={breathingDelays[idx % breathingDelays.length]}
                duration={breathingDurations[idx % breathingDurations.length]}
                reduceMotion={reduceMotion}
              />
            );
          }
          return <RouterUse key={n.id} node={n} active={false} />;
        })}
      </g>

      <Packet points={sampled} reduceMotion={reduceMotion} />
    </svg>
  );
}

const CARD_CLASS =
  "pointer-events-none absolute z-20 rounded-[14px] border border-white/12 bg-[#0a1628]/88 backdrop-blur-xl shadow-[0_12px_36px_rgba(2,8,23,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]";

function TcpFlowCard() {
  const sparkPoints = "2,14 10,9 18,12 26,6 34,10 42,4 50,8 58,3 66,7 74,2";
  return (
    <div className={`${CARD_CLASS} left-4 top-6 px-3.5 py-2.5 lg:left-5 lg:top-8`}>
      <div className="flex items-center gap-2">
        <ArrowRightLeft className="h-3.5 w-3.5 text-cyan-300" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">
          TCP Flow
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="text-[11px] font-mono text-white/85">SYN → ACK</span>
        <svg viewBox="0 0 76 16" className="h-3.5 w-[76px]">
          <polyline
            points={sparkPoints}
            fill="none"
            stroke="rgba(103,232,249,0.85)"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

function PacketCard() {
  return (
    <div className={`${CARD_CLASS} right-4 top-6 px-3.5 py-2.5 lg:right-5 lg:top-8`}>
      <div className="flex items-center gap-2">
        <Radio className="h-3.5 w-3.5 text-orange-300" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">
          Packet #2041
        </span>
      </div>
      <div className="mt-1.5 font-mono text-[11px] leading-[1.35] text-white/85">
        192.168.1.1 → 10.0.0.5
      </div>
      <div className="mt-0.5 flex items-center gap-3 font-mono text-[10px] text-white/55">
        <span>TTL: 37</span>
        <span className="h-0.5 w-0.5 rounded-full bg-white/35" />
        <span>8 hops</span>
      </div>
    </div>
  );
}

function useThroughputSpark(reduceMotion: boolean) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [points, setPoints] = useState<number[]>(() => {
    const arr: number[] = [];
    let v = 60;
    for (let i = 0; i < 20; i++) {
      v = Math.max(30, Math.min(90, v + (Math.random() - 0.5) * 10));
      arr.push(v);
    }
    return arr;
  });

  useEffect(() => {
    if (reduceMotion) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let intervalId: number | null = null;
    let tabVisible =
      typeof document !== "undefined" ? document.visibilityState === "visible" : true;
    let onScreen = true;

    const tick = () => {
      setPoints((prev) => {
        const last = prev[prev.length - 1];
        const next = Math.max(30, Math.min(90, last + (Math.random() - 0.5) * 12));
        return [...prev.slice(1), next];
      });
    };

    const start = () => {
      if (tabVisible && onScreen && intervalId === null) {
        intervalId = window.setInterval(tick, 1000);
      }
    };
    const stop = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const onVisibility = () => {
      tabVisible = document.visibilityState === "visible";
      if (!tabVisible) stop();
      else start();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        if (!onScreen) stop();
        else start();
      },
      { threshold: 0 },
    );
    observer.observe(wrapper);
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduceMotion]);

  return { wrapperRef, points };
}

function ThroughputCard({
  reduceMotion,
  position,
}: {
  reduceMotion: boolean;
  position: "left" | "center";
}) {
  const { wrapperRef, points } = useThroughputSpark(reduceMotion);

  const pointsStr = useMemo(() => {
    const w = 84;
    const h = 28;
    const min = 30;
    const max = 90;
    const step = w / (points.length - 1);
    return points
      .map((v, i) => {
        const x = i * step;
        const y = h - ((v - min) / (max - min)) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [points]);

  const positionClasses =
    position === "center"
      ? "left-1/2 bottom-6 -translate-x-1/2"
      : "left-4 bottom-6 lg:left-5 lg:bottom-9";

  return (
    <div
      ref={wrapperRef}
      className={`${CARD_CLASS} ${positionClasses} px-3.5 py-2.5`}
    >
      <div className="flex items-center gap-2">
        <TrendingUp className="h-3.5 w-3.5 text-emerald-300" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">
          Throughput
        </span>
      </div>
      <div className="mt-1 flex items-end gap-2.5">
        <div>
          <div className="font-mono text-[14px] font-semibold leading-none text-white">
            92.3
          </div>
          <div className="mt-0.5 text-[9px] uppercase tracking-wider text-white/50">
            Mbps
          </div>
        </div>
        <svg viewBox="0 0 84 28" className="h-7 w-[84px]">
          <polyline
            points={pointsStr}
            fill="none"
            stroke="rgba(110,231,183,0.9)"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

function LiveSimCard({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div
      className={`${CARD_CLASS} right-4 bottom-6 px-3 py-2 lg:right-5 lg:bottom-9`}
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          {!reduceMotion && (
            <motion.span
              className="absolute inset-0 rounded-full bg-emerald-400"
              animate={{ opacity: [0.6, 0, 0.6], scale: [1, 2.1, 1] }}
              transition={{ duration: 1.8, ease: "easeOut", repeat: Infinity }}
            />
          )}
          <span className="relative h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        </span>
        <span className="text-[11px] font-medium text-white/85">Live Simulation</span>
      </div>
    </div>
  );
}

export default function HeroNetwork() {
  const reduceMotion = Boolean(useReducedMotion());
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isTabletOrAbove = useMediaQuery("(min-width: 640px)");

  const variant = isDesktop ? "desktop" : isTabletOrAbove ? "tablet" : "mobile";

  return (
    <div className="relative h-full w-full">
      {variant === "desktop" && (
        <Mesh
          nodes={DESKTOP_NODES}
          edges={DESKTOP_EDGES}
          activeIds={DESKTOP_ACTIVE_IDS}
          breathingIds={DESKTOP_BREATHING_IDS}
          viewBox="0 0 800 500"
          className="h-full w-full"
          reduceMotion={reduceMotion}
        />
      )}
      {variant === "tablet" && (
        <Mesh
          nodes={TABLET_NODES}
          edges={TABLET_EDGES}
          activeIds={TABLET_ACTIVE_IDS}
          breathingIds={TABLET_BREATHING_IDS}
          viewBox="0 0 800 500"
          className="h-full w-full"
          reduceMotion={reduceMotion}
        />
      )}
      {variant === "mobile" && (
        <Mesh
          nodes={MOBILE_NODES}
          edges={[]}
          activeIds={MOBILE_ACTIVE_IDS}
          breathingIds={[]}
          viewBox="0 0 400 400"
          className="mx-auto h-full w-full max-w-[420px]"
          reduceMotion={reduceMotion}
        />
      )}

      {variant === "desktop" && (
        <>
          <TcpFlowCard />
          <PacketCard />
          <ThroughputCard reduceMotion={reduceMotion} position="left" />
          <LiveSimCard reduceMotion={reduceMotion} />
        </>
      )}
      {variant === "tablet" && (
        <>
          <PacketCard />
          <ThroughputCard reduceMotion={reduceMotion} position="left" />
        </>
      )}
      {variant === "mobile" && (
        <ThroughputCard reduceMotion={reduceMotion} position="center" />
      )}
    </div>
  );
}
