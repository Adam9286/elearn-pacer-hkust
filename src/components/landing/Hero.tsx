import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BookOpen,
  FileText,
  MessageSquare,
  Sparkles,
  Network,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProductCanvas from "./ProductCanvas";

const heroSignals = [
  { icon: MessageSquare, label: "AI Chat" },
  { icon: BookOpen, label: "Guided Lessons" },
  { icon: Activity, label: "Simulations" },
  { icon: FileText, label: "Mock Exams" },
];

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-5 sm:px-6 lg:px-8 lg:pb-28">
      {/* ——— Top nav bar ——— */}
      <div className="mx-auto max-w-7xl">
        <div className="rounded-full border border-white/[0.07] bg-white/[0.02] px-4 py-2.5 backdrop-blur-sm xl:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.07]">
                <Activity className="h-4 w-4 text-cyan-300" />
              </div>
              <div>
                <p className="font-display text-[14px] font-semibold tracking-tight text-white/90">
                  LearningPacer
                </p>
                <p className="text-[9px] uppercase tracking-[0.3em] text-white/30">
                  ELEC3120
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="hidden rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-white/35 md:inline-block">
                Course-specific AI platform
              </span>
              <button
                type="button"
                onClick={() => navigate("/auth")}
                className="rounded-full border border-white/[0.08] px-4 py-1.5 text-[13px] font-medium text-white/55 transition-colors hover:border-white/15 hover:bg-white/[0.03] hover:text-white/85"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>

        {/* ——— Hero two-column grid ——— */}
        <div className="grid gap-14 pt-20 lg:grid-cols-[1fr_minmax(480px,1.1fr)] lg:items-center lg:gap-20 lg:pt-24 xl:gap-24">
          {/* ——— Left column ——— */}
          <div className="max-w-[520px]">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/[0.05] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-200/75"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
              Built for ELEC3120 revision
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.06, ease: "easeOut" }}
              className="mt-6 font-display text-[2.5rem] font-bold leading-[1.08] tracking-[-0.03em] text-white sm:text-[3rem] xl:text-[3.25rem]"
            >
              Learn Computer Networks
              <br className="hidden sm:block" />
              {" the way "}
              <span className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-cyan-400 bg-clip-text text-transparent">
                ELEC3120
              </span>
              {" teaches it"}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12, ease: "easeOut" }}
              className="mt-5 max-w-[440px] text-[15px] leading-[1.75] text-white/50 sm:text-base"
            >
              Course-grounded AI chat, guided slide-by-slide lessons,
              interactive protocol simulations, and mock exam generation —
              one focused study platform.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.2, ease: "easeOut" }}
              className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <button
                type="button"
                onClick={() => navigate("/platform")}
                className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-cyan-400 px-7 py-3 text-[13px] font-semibold text-[#040c1b] shadow-[0_0_20px_rgba(34,211,238,0.2),0_2px_8px_rgba(0,0,0,0.3)] transition-all hover:-translate-y-px hover:bg-cyan-300 hover:shadow-[0_0_28px_rgba(34,211,238,0.3),0_4px_12px_rgba(0,0,0,0.3)]"
              >
                Explore the Platform
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate("/platform", { state: { mode: "simulations" } })
                }
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.02] px-6 py-3 text-[13px] font-medium text-white/60 transition-all hover:border-white/[0.16] hover:bg-white/[0.04] hover:text-white/85"
              >
                View Simulations
              </button>
            </motion.div>

            {/* Feature chips */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.35, ease: "easeOut" }}
              className="mt-10 flex flex-wrap gap-2"
            >
              {heroSignals.map((signal) => (
                <div
                  key={signal.label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-3.5 py-2 text-[11px] font-medium text-white/40"
                >
                  <signal.icon className="h-3.5 w-3.5 text-cyan-400/50" />
                  <span>{signal.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ——— Right column — Product Canvas + overlay cards ——— */}
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.985 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
            className="relative lg:ml-4"
          >
            {/* Radial glow behind canvas */}
            <div className="pointer-events-none absolute -inset-16 hidden lg:block">
              <div className="absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/[0.06] blur-[100px]" />
              <div className="absolute left-[55%] top-[38%] h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/[0.05] blur-[70px]" />
            </div>

            <ProductCanvas />

            {/* ——— Overlay card: AI Tutor (upper-left) ——— */}
            <motion.div
              initial={{ opacity: 0, y: 14, x: -8 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
              className="absolute -left-3 top-14 z-10 hidden w-[268px] rounded-[14px] border border-white/[0.08] bg-[rgba(6,13,28,0.94)] shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur-2xl sm:block lg:-left-8 xl:-left-10"
            >
              {/* Card top accent */}
              <div className="absolute inset-x-0 top-0 h-px rounded-t-[14px] bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />

              {/* Card header */}
              <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-400/[0.1] ring-1 ring-cyan-400/[0.12]">
                    <Sparkles className="h-3 w-3 text-cyan-300/80" />
                  </div>
                  <span className="text-[11px] font-semibold text-white/70">
                    AI Tutor
                  </span>
                </div>
                <span className="rounded-full bg-cyan-400/[0.06] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-cyan-300/50">
                  Course-grounded
                </span>
              </div>

              {/* Chat messages */}
              <div className="space-y-2 px-4 py-3">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="max-w-[88%] rounded-xl rounded-br-md bg-white/[0.06] px-3 py-2">
                    <p className="text-[11px] leading-[1.55] text-white/55">
                      How does TCP ensure reliable delivery?
                    </p>
                  </div>
                </div>

                {/* AI response */}
                <div className="flex justify-start">
                  <div className="max-w-[92%] rounded-xl rounded-bl-md border border-cyan-400/[0.08] bg-cyan-400/[0.03] px-3 py-2.5">
                    <p className="text-[11px] leading-[1.6] text-white/60">
                      TCP uses <span className="text-cyan-200/70">sequence numbers</span> and{" "}
                      <span className="text-cyan-200/70">ACKs</span> to track every
                      segment. If an ACK isn't received within the{" "}
                      <span className="text-cyan-200/70">retransmission timeout</span>,
                      the segment is resent…
                    </p>
                    <div className="mt-2 flex items-center gap-3 border-t border-white/[0.04] pt-2">
                      <div className="flex items-center gap-1">
                        <span className="h-1 w-1 animate-pulse rounded-full bg-cyan-400/50" />
                        <span className="text-[9px] text-white/25">
                          Lecture 6, Slide 14
                        </span>
                      </div>
                      <span className="text-[9px] text-white/15">|</span>
                      <span className="text-[9px] text-white/25">
                        Textbook §3.5
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ——— Overlay card: Simulation (bottom-right) ——— */}
            <motion.div
              initial={{ opacity: 0, y: 14, x: 8 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ duration: 0.5, delay: 0.65, ease: "easeOut" }}
              className="absolute -bottom-5 -right-2 z-10 hidden w-[248px] rounded-[14px] border border-white/[0.08] bg-[rgba(6,13,28,0.94)] shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur-2xl sm:block lg:-right-6 xl:-right-8"
            >
              {/* Card top accent */}
              <div className="absolute inset-x-0 top-0 h-px rounded-t-[14px] bg-gradient-to-r from-transparent via-blue-400/20 to-transparent" />

              {/* Card header */}
              <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-400/[0.1] ring-1 ring-blue-400/[0.12]">
                    <Network className="h-3 w-3 text-blue-300/80" />
                  </div>
                  <span className="text-[11px] font-semibold text-white/70">
                    TCP Handshake
                  </span>
                </div>
                <span className="flex items-center gap-1 rounded-full bg-emerald-400/[0.08] px-2 py-0.5 ring-1 ring-emerald-400/[0.1]">
                  <span className="h-[4px] w-[4px] rounded-full bg-emerald-400/70 shadow-[0_0_4px_rgba(52,211,153,0.5)]" />
                  <span className="text-[8px] font-semibold uppercase tracking-[0.1em] text-emerald-300/60">
                    Live
                  </span>
                </span>
              </div>

              {/* Mini topology */}
              <div className="px-4 py-3">
                <svg
                  viewBox="0 0 208 56"
                  className="w-full"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Edges */}
                  <line
                    x1="32"
                    y1="22"
                    x2="104"
                    y2="22"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="1"
                  />
                  <line
                    x1="104"
                    y1="22"
                    x2="176"
                    y2="22"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="1"
                  />

                  {/* Active edge overlay */}
                  <motion.line
                    x1="32"
                    y1="22"
                    x2="176"
                    y2="22"
                    stroke="rgba(34,211,238,0.2)"
                    strokeWidth="1.5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{
                      duration: 1.2,
                      delay: 0.8,
                      ease: "easeOut",
                    }}
                  />

                  {/* Nodes */}
                  <circle
                    cx="32"
                    cy="22"
                    r="8"
                    fill="rgba(34,211,238,0.06)"
                    stroke="rgba(34,211,238,0.25)"
                    strokeWidth="1"
                  />
                  <circle
                    cx="104"
                    cy="22"
                    r="6"
                    fill="rgba(59,130,246,0.06)"
                    stroke="rgba(59,130,246,0.25)"
                    strokeWidth="1"
                  />
                  <circle
                    cx="176"
                    cy="22"
                    r="8"
                    fill="rgba(34,211,238,0.06)"
                    stroke="rgba(34,211,238,0.25)"
                    strokeWidth="1"
                  />

                  {/* Center node inner dot */}
                  <circle cx="104" cy="22" r="2" fill="rgba(59,130,246,0.3)" />

                  {/* Animated pulse */}
                  <motion.circle
                    r="3"
                    fill="#67e8f9"
                    animate={{
                      cx: [32, 104, 176],
                      opacity: [0, 0.9, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 1.2,
                      ease: "easeInOut",
                    }}
                    cy={22}
                    style={{
                      filter: "drop-shadow(0 0 5px rgba(103,232,249,0.6))",
                    }}
                  />

                  {/* Labels */}
                  <text
                    x="32"
                    y="44"
                    textAnchor="middle"
                    fontSize="7"
                    fill="rgba(255,255,255,0.25)"
                    fontFamily="monospace"
                    letterSpacing="0.8"
                  >
                    CLIENT
                  </text>
                  <text
                    x="104"
                    y="44"
                    textAnchor="middle"
                    fontSize="7"
                    fill="rgba(255,255,255,0.25)"
                    fontFamily="monospace"
                    letterSpacing="0.8"
                  >
                    ROUTER
                  </text>
                  <text
                    x="176"
                    y="44"
                    textAnchor="middle"
                    fontSize="7"
                    fill="rgba(255,255,255,0.25)"
                    fontFamily="monospace"
                    letterSpacing="0.8"
                  >
                    SERVER
                  </text>
                </svg>

                {/* Packet labels */}
                <div className="mt-2.5 flex items-center gap-1.5">
                  {["SYN", "SYN-ACK", "ACK"].map((step, i) => (
                    <motion.span
                      key={step}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.9 + i * 0.12 }}
                      className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.1em] text-white/30"
                    >
                      {step}
                    </motion.span>
                  ))}
                  <span className="ml-auto text-[8px] tabular-nums text-white/15">
                    3 steps
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
