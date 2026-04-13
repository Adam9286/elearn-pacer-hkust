import { motion } from "framer-motion";
import { ArrowRight, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ——— Static simulation preview (right side) ——— */
const SimulationPreview = () => (
  <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[linear-gradient(180deg,rgba(10,18,36,0.97),rgba(8,14,28,0.96))] shadow-[0_20px_60px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.02)]">
    {/* Top highlight */}
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />

    {/* Window top bar */}
    <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.01] px-5 py-3">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-[6px]">
          <span className="h-2 w-2 rounded-full bg-white/[0.07] ring-1 ring-inset ring-white/[0.05]" />
          <span className="h-2 w-2 rounded-full bg-white/[0.07] ring-1 ring-inset ring-white/[0.05]" />
          <span className="h-2 w-2 rounded-full bg-white/[0.07] ring-1 ring-inset ring-white/[0.05]" />
        </div>
        <div className="h-3.5 w-px bg-white/[0.05]" />
        <span className="text-[10px] font-semibold text-white/35">
          TCP 3-Way Handshake
        </span>
      </div>
      <div className="flex items-center gap-1.5 rounded-full border border-white/[0.05] bg-white/[0.02] px-2 py-0.5">
        <span className="h-[4px] w-[4px] rounded-full bg-emerald-400/60 shadow-[0_0_4px_rgba(52,211,153,0.4)]" />
        <span className="text-[8px] font-medium uppercase tracking-[0.12em] text-white/25">
          Interactive
        </span>
      </div>
    </div>

    {/* SVG Visualization */}
    <div className="px-6 py-8">
      <svg
        viewBox="0 0 520 280"
        className="w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Subtle grid background */}
        <defs>
          <pattern id="sim-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="520" height="280" fill="url(#sim-grid)" />

        {/* Timeline columns */}
        <line x1="100" y1="50" x2="100" y2="240" stroke="rgba(34,211,238,0.08)" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="420" y1="50" x2="420" y2="240" stroke="rgba(34,211,238,0.08)" strokeWidth="1" strokeDasharray="4 4" />

        {/* Column headers */}
        <text x="100" y="36" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.35)" fontFamily="monospace" letterSpacing="1.5">CLIENT</text>
        <text x="420" y="36" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.35)" fontFamily="monospace" letterSpacing="1.5">SERVER</text>

        {/* Client node */}
        <circle cx="100" cy="50" r="6" fill="rgba(34,211,238,0.08)" stroke="rgba(34,211,238,0.3)" strokeWidth="1" />
        <circle cx="100" cy="50" r="2.5" fill="rgba(34,211,238,0.4)" />

        {/* Server node */}
        <circle cx="420" cy="50" r="6" fill="rgba(34,211,238,0.08)" stroke="rgba(34,211,238,0.3)" strokeWidth="1" />
        <circle cx="420" cy="50" r="2.5" fill="rgba(34,211,238,0.4)" />

        {/* SYN arrow: Client → Server */}
        <line x1="108" y1="85" x2="412" y2="115" stroke="rgba(103,232,249,0.35)" strokeWidth="1.5" />
        {/* Arrowhead */}
        <polygon points="412,115 402,110 404,118" fill="rgba(103,232,249,0.35)" />
        {/* SYN label */}
        <rect x="220" y="82" width="80" height="22" rx="6" fill="rgba(34,211,238,0.06)" stroke="rgba(34,211,238,0.12)" strokeWidth="0.8" />
        <text x="260" y="97" textAnchor="middle" fontSize="9" fill="rgba(103,232,249,0.7)" fontFamily="monospace" letterSpacing="1">SYN</text>

        {/* SYN-ACK arrow: Server → Client */}
        <line x1="412" y1="140" x2="108" y2="170" stroke="rgba(147,197,253,0.3)" strokeWidth="1.5" />
        {/* Arrowhead */}
        <polygon points="108,170 118,165 116,173" fill="rgba(147,197,253,0.3)" />
        {/* SYN-ACK label */}
        <rect x="218" y="138" width="84" height="22" rx="6" fill="rgba(59,130,246,0.06)" stroke="rgba(59,130,246,0.12)" strokeWidth="0.8" />
        <text x="260" y="153" textAnchor="middle" fontSize="9" fill="rgba(147,197,253,0.65)" fontFamily="monospace" letterSpacing="1">SYN-ACK</text>

        {/* ACK arrow: Client → Server */}
        <line x1="108" y1="195" x2="412" y2="225" stroke="rgba(34,211,238,0.3)" strokeWidth="1.5" />
        {/* Arrowhead */}
        <polygon points="412,225 402,220 404,228" fill="rgba(34,211,238,0.3)" />
        {/* ACK label */}
        <rect x="220" y="192" width="80" height="22" rx="6" fill="rgba(34,211,238,0.06)" stroke="rgba(34,211,238,0.12)" strokeWidth="0.8" />
        <text x="260" y="207" textAnchor="middle" fontSize="9" fill="rgba(103,232,249,0.65)" fontFamily="monospace" letterSpacing="1">ACK</text>

        {/* Connection established indicator */}
        <line x1="80" y1="248" x2="440" y2="248" stroke="rgba(52,211,153,0.15)" strokeWidth="1" strokeDasharray="3 6" />
        <text x="260" y="268" textAnchor="middle" fontSize="8" fill="rgba(52,211,153,0.4)" fontFamily="monospace" letterSpacing="1.5">CONNECTION ESTABLISHED</text>
      </svg>
    </div>

    {/* Bottom info bar */}
    <div className="flex items-center justify-between border-t border-white/[0.05] px-5 py-3">
      <div className="flex items-center gap-3">
        {["SYN", "SYN-ACK", "ACK"].map((step, i) => (
          <span
            key={step}
            className="rounded-md border border-white/[0.06] bg-white/[0.025] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-white/30"
          >
            {step}
          </span>
        ))}
      </div>
      <span className="text-[9px] tabular-nums text-white/20">
        Step 3 / 3
      </span>
    </div>
  </div>
);

/* ——— Main component ——— */
const SimulationShowcase = () => {
  const navigate = useNavigate();

  return (
    <section id="simulations" className="px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-center lg:gap-20">
          {/* ——— Left side: text ——— */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300/60">
              Interactive Simulations
            </p>
            <h2 className="mt-3 font-display text-[2rem] font-bold tracking-[-0.03em] text-white sm:text-[2.5rem]">
              See protocols move,
              <br />
              not just read about them
            </h2>
            <p className="mt-4 text-[15px] leading-[1.75] text-white/45">
              LearningPacer's 18 simulators turn abstract protocol behavior
              into visual systems you can step through, replay, and reason
              about.
            </p>

            {/* Key points */}
            <div className="mt-8 space-y-4">
              {[
                {
                  title: "Step-by-step packet flow",
                  desc: "Watch SYN, ACK, and data segments move between nodes with real timing.",
                },
                {
                  title: "Visual intuition",
                  desc: "Sliding windows, congestion control, and routing become spatial rather than abstract.",
                },
                {
                  title: "Exam-aligned topics",
                  desc: "Every simulator maps to a concept that appears in ELEC3120 assessments.",
                },
              ].map((point) => (
                <div key={point.title} className="flex items-start gap-3">
                  <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-cyan-400/[0.06] ring-1 ring-cyan-400/[0.08]">
                    <Eye className="h-2.5 w-2.5 text-cyan-400/50" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-white/65">
                      {point.title}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-[1.6] text-white/35">
                      {point.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/platform", { state: { mode: "simulations" } })
              }
              className="group/btn mt-10 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-5 py-2.5 text-[13px] font-medium text-white/55 transition-all duration-200 hover:-translate-y-px hover:border-cyan-400/[0.15] hover:bg-white/[0.04] hover:text-white/80"
            >
              Open Simulations
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
            </button>
          </motion.div>

          {/* ——— Right side: visual ——— */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.55, delay: 0.08, ease: "easeOut" }}
            className="relative"
          >
            {/* Faint glow behind */}
            <div className="pointer-events-none absolute -inset-10 hidden lg:block">
              <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/[0.04] blur-[80px]" />
            </div>

            <SimulationPreview />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SimulationShowcase;
