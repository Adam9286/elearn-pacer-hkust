import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type ShowcaseId = "handshake" | "window" | "routing";

const showcases: Array<{
  id: ShowcaseId;
  title: string;
  strap: string;
  description: string;
  points: string[];
}> = [
  {
    id: "handshake",
    title: "TCP Handshake",
    strap: "Connection setup becomes visible",
    description:
      "Watch SYN, SYN-ACK, and ACK establish a reliable session before data starts moving. Beginners stop memorizing names and start seeing direction and timing.",
    points: [
      "Clear packet direction instead of abstract arrows in notes",
      "Shows why data does not start until the session is established",
      "Turns a classic exam topic into a readable visual sequence",
    ],
  },
  {
    id: "window",
    title: "Sliding Window",
    strap: "Paced delivery becomes intuitive",
    description:
      "See how multiple packets can stay in flight, how acknowledgments advance the window, and why losses slow the sender down until reliability is restored.",
    points: [
      "Makes flow control and ACK behavior easier to reason about",
      "Shows throughput as motion instead of a dry rule list",
      "Helps students understand retransmission and recovery",
    ],
  },
  {
    id: "routing",
    title: "Routing Paths",
    strap: "Shortest paths stop feeling invisible",
    description:
      "Route illumination shows how traffic locks onto a best path through the network instead of making routing feel like tables with no motion behind them.",
    points: [
      "Highlights path selection in a way that feels immediate",
      "Supports intuition before diving into algorithm details",
      "Reinforces the identity of the product as a networks platform",
    ],
  },
];

const previewCardClass =
  "rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(7,15,29,0.94),rgba(5,10,20,0.88))] shadow-[0_25px_90px_rgba(2,12,27,0.32)] backdrop-blur";

const HandshakePreview = () => {
  const forwardPoints = [
    { x: 82, y: 176 },
    { x: 220, y: 126 },
    { x: 360, y: 210 },
    { x: 548, y: 176 },
  ];
  const reversePoints = [...forwardPoints].reverse();
  const times = forwardPoints.map((_, index) => index / (forwardPoints.length - 1));

  return (
    <div className={`relative min-h-[360px] overflow-hidden p-6 ${previewCardClass}`}>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:56px_56px] opacity-20" />
      <div className="relative">
        <div className="flex flex-wrap gap-2">
          {["SYN", "SYN-ACK", "ACK"].map((label, index) => (
            <motion.div
              key={label}
              className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100"
              animate={{ opacity: [0.45, 1, 0.45] }}
              transition={{ duration: 3.6, delay: index * 0.6, repeat: Infinity, repeatDelay: 0.5 }}
            >
              {label}
            </motion.div>
          ))}
        </div>

        <svg viewBox="0 0 620 260" className="mt-8 h-[250px] w-full">
          <defs>
            <filter id="preview-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            d="M82 176 C 162 112, 302 102, 548 176"
            stroke="rgba(34,211,238,0.14)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <line x1="82" y1="176" x2="548" y2="176" stroke="rgba(255,255,255,0.08)" strokeWidth="1.1" />

          <circle cx="82" cy="176" r="10" fill="rgba(34,211,238,0.2)" />
          <circle cx="82" cy="176" r="6" fill="#7dd3fc" />
          <circle cx="548" cy="176" r="10" fill="rgba(34,211,238,0.2)" />
          <circle cx="548" cy="176" r="6" fill="#7dd3fc" />

          <text x="62" y="205" fontSize="10" fontFamily="monospace" fill="rgba(255,255,255,0.4)">
            CLIENT
          </text>
          <text x="518" y="205" fontSize="10" fontFamily="monospace" fill="rgba(255,255,255,0.4)">
            SERVER
          </text>

          <motion.circle
            r="5"
            fill="#67e8f9"
            initial={{ cx: forwardPoints[0].x, cy: forwardPoints[0].y, opacity: 0 }}
            animate={{
              cx: forwardPoints.map((point) => point.x),
              cy: forwardPoints.map((point) => point.y),
              opacity: [0, 1, 1, 0],
            }}
            transition={{ duration: 1.2, times, repeat: Infinity, repeatDelay: 2.4 }}
            style={{ filter: "url(#preview-glow)" }}
          />
          <motion.circle
            r="4"
            fill="#93c5fd"
            initial={{ cx: reversePoints[0].x, cy: reversePoints[0].y, opacity: 0 }}
            animate={{
              cx: reversePoints.map((point) => point.x),
              cy: reversePoints.map((point) => point.y),
              opacity: [0, 1, 1, 0],
            }}
            transition={{ duration: 1.2, times, repeat: Infinity, repeatDelay: 2.4, delay: 0.9 }}
            style={{ filter: "url(#preview-glow)" }}
          />
          <motion.circle
            r="4.5"
            fill="#22d3ee"
            initial={{ cx: forwardPoints[0].x, cy: forwardPoints[0].y, opacity: 0 }}
            animate={{
              cx: forwardPoints.map((point) => point.x),
              cy: forwardPoints.map((point) => point.y),
              opacity: [0, 1, 1, 0],
            }}
            transition={{ duration: 1.1, times, repeat: Infinity, repeatDelay: 2.4, delay: 1.8 }}
            style={{ filter: "url(#preview-glow)" }}
          />
        </svg>
      </div>
    </div>
  );
};

const SlidingWindowPreview = () => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPhase((current) => (current + 1) % 4);
    }, 1100);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className={`relative min-h-[360px] overflow-hidden p-6 ${previewCardClass}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(34,211,238,0.08),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(59,130,246,0.12),transparent_32%)]" />
      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/42">
              Window State
            </p>
            <p className="mt-2 text-sm text-white/64">ACKs advance the send window and open room for more packets.</p>
          </div>
          <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
            ACK {phase + 4}
          </div>
        </div>

        <div className="mt-10 rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <div className="grid grid-cols-8 gap-2">
            {Array.from({ length: 8 }, (_, index) => {
              const state =
                index < phase ? "acked" : index < phase + 4 ? "flight" : "queued";

              return (
                <div
                  key={index}
                  className={`rounded-2xl border px-2 py-4 text-center text-sm font-semibold transition-colors ${
                    state === "acked"
                      ? "border-emerald-400/25 bg-emerald-400/15 text-emerald-200"
                      : state === "flight"
                        ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                        : "border-white/10 bg-white/[0.02] text-white/40"
                  }`}
                >
                  {index + 1}
                </div>
              );
            })}
          </div>

          <motion.div
            className="mt-6 h-1 rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-300"
            animate={{ width: ["18%", "44%", "70%", "44%"] }}
            transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[#07101e]/82 px-4 py-4 text-sm text-white/60">
              Four packets can stay in flight before the sender has to wait.
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#07101e]/82 px-4 py-4 text-sm text-white/60">
              As ACKs arrive, the sender slides the window and keeps the pipe moving.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RoutingPreview = () => {
  const [routeIndex, setRouteIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRouteIndex((current) => (current + 1) % 3);
    }, 2200);

    return () => window.clearInterval(interval);
  }, []);

  const routes = [
    ["s", "r1", "r4", "d"],
    ["s", "r2", "r4", "d"],
    ["s", "r2", "r5", "d"],
  ] as const;
  const nodes = {
    s: { x: 84, y: 210 },
    r1: { x: 208, y: 98 },
    r2: { x: 220, y: 210 },
    r4: { x: 384, y: 138 },
    r5: { x: 400, y: 286 },
    d: { x: 560, y: 210 },
  } as const;
  const edges: Array<[keyof typeof nodes, keyof typeof nodes]> = [
    ["s", "r1"],
    ["s", "r2"],
    ["r1", "r4"],
    ["r2", "r4"],
    ["r2", "r5"],
    ["r4", "d"],
    ["r5", "d"],
  ];
  const activeRoute = routes[routeIndex];
  const activeEdge = (left: keyof typeof nodes, right: keyof typeof nodes) =>
    activeRoute.some((node, index) => {
      const next = activeRoute[index + 1];
      return (node === left && next === right) || (node === right && next === left);
    });

  const pathPoints = activeRoute.map((node) => nodes[node]);
  const times = pathPoints.map((_, index) => index / (pathPoints.length - 1));

  return (
    <div className={`relative min-h-[360px] overflow-hidden p-6 ${previewCardClass}`}>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px] opacity-18" />
      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/42">
              Routing View
            </p>
            <p className="mt-2 text-sm text-white/64">The best path stands out when the graph itself becomes readable.</p>
          </div>
          <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
            Path {routeIndex + 1}
          </div>
        </div>

        <svg viewBox="0 0 620 330" className="mt-8 h-[250px] w-full">
          <defs>
            <filter id="route-preview-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {edges.map(([left, right]) => (
            <motion.line
              key={`${left}-${right}`}
              x1={nodes[left].x}
              y1={nodes[left].y}
              x2={nodes[right].x}
              y2={nodes[right].y}
              strokeLinecap="round"
              animate={{
                stroke: activeEdge(left, right) ? "rgba(34,211,238,0.84)" : "rgba(255,255,255,0.08)",
                strokeWidth: activeEdge(left, right) ? 2.4 : 1.2,
              }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              filter={activeEdge(left, right) ? "url(#route-preview-glow)" : undefined}
            />
          ))}

          {Object.entries(nodes).map(([label, node]) => {
            const active = activeRoute.includes(label as typeof activeRoute[number]);
            return (
              <g key={label}>
                <circle cx={node.x} cy={node.y} r={active ? 8 : 6} fill={active ? "#7dd3fc" : "rgba(255,255,255,0.25)"} />
                <text
                  x={node.x}
                  y={node.y + 26}
                  textAnchor="middle"
                  fontSize="10"
                  fontFamily="monospace"
                  fill="rgba(255,255,255,0.38)"
                >
                  {label.toUpperCase()}
                </text>
              </g>
            );
          })}

          <motion.circle
            r="4.5"
            fill="#67e8f9"
            initial={{ cx: pathPoints[0].x, cy: pathPoints[0].y, opacity: 0 }}
            animate={{
              cx: pathPoints.map((point) => point.x),
              cy: pathPoints.map((point) => point.y),
              opacity: [0, 1, 1, 0],
            }}
            transition={{ duration: 1.5, times, repeat: Infinity, repeatDelay: 0.7 }}
            style={{ filter: "url(#route-preview-glow)" }}
          />
        </svg>
      </div>
    </div>
  );
};

const SimulationShowcase = () => {
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<ShowcaseId>("handshake");
  const active = showcases.find((item) => item.id === activeId) ?? showcases[0];

  const renderPreview = () => {
    if (activeId === "window") return <SlidingWindowPreview />;
    if (activeId === "routing") return <RoutingPreview />;
    return <HandshakePreview />;
  };

  return (
    <section id="simulations" className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200/80">
              Signature Visual Section
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">
              When protocols move, understanding clicks
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/64">
              This is where LearningPacer stops feeling like a chatbot and starts feeling like a
              networking product. The visual layer turns protocol behavior into something students can
              actually follow.
            </p>

            <div className="mt-8 space-y-3">
              {showcases.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  className={`w-full rounded-[24px] border px-5 py-4 text-left transition-colors ${
                    item.id === activeId
                      ? "border-cyan-300/25 bg-cyan-400/10"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.045]"
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40">
                    {item.strap}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-white">{item.title}</p>
                  <p className="mt-2 text-sm leading-7 text-white/56">{item.description}</p>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => navigate("/platform", { state: { mode: "simulations" } })}
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white/80 transition-colors hover:border-cyan-300/20 hover:bg-white/[0.06] hover:text-white"
            >
              Open Simulations Mode
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55, delay: 0.08, ease: "easeOut" }}
          >
            <motion.div key={activeId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              {renderPreview()}
            </motion.div>

            <div className="mt-5 rounded-[28px] border border-white/10 bg-white/[0.035] p-6 backdrop-blur">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/42">
                    Learning Benefit
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">{active.title}</h3>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-white/58">{active.description}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {active.points.map((point) => (
                  <div key={point} className="rounded-[20px] border border-white/10 bg-[#07101e]/82 px-4 py-4 text-sm text-white/62">
                    {point}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SimulationShowcase;
