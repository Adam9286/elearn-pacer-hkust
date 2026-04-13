import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BookOpen,
  FileText,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ——— Mini visual for AI Chat card ——— */
const ChatVisual = () => (
  <div className="mt-5 space-y-2">
    {/* User bubble */}
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-xl rounded-br-md bg-white/[0.05] px-3 py-2">
        <p className="text-[10px] leading-[1.5] text-white/40">
          What's the difference between TCP and UDP?
        </p>
      </div>
    </div>
    {/* AI bubble */}
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-xl rounded-bl-md border border-cyan-400/[0.06] bg-cyan-400/[0.025] px-3 py-2">
        <p className="text-[10px] leading-[1.5] text-white/45">
          TCP provides <span className="text-cyan-300/60">reliable, ordered</span>{" "}
          delivery with flow control. UDP is connectionless…
        </p>
        <div className="mt-1.5 flex items-center gap-1 text-[8px] text-white/20">
          <Sparkles className="h-2.5 w-2.5 text-cyan-400/40" />
          Lecture 5, Slide 8
        </div>
      </div>
    </div>
  </div>
);

/* ——— Mini visual for Lessons card ——— */
const LessonsVisual = () => (
  <div className="mt-5 space-y-1.5">
    {[
      { label: "Application Layer", done: true },
      { label: "Transport Layer", done: true },
      { label: "Network Layer", active: true },
      { label: "Link Layer", done: false },
    ].map((item) => (
      <div
        key={item.label}
        className={`flex items-center gap-2.5 rounded-lg px-3 py-1.5 ${
          item.active
            ? "bg-cyan-400/[0.06] ring-1 ring-cyan-400/[0.08]"
            : ""
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            item.done
              ? "bg-emerald-400/50"
              : item.active
                ? "bg-cyan-400/60"
                : "bg-white/10"
          }`}
        />
        <span
          className={`text-[10px] font-medium ${
            item.active ? "text-white/55" : item.done ? "text-white/30" : "text-white/20"
          }`}
        >
          {item.label}
        </span>
        {item.active && (
          <span className="ml-auto text-[8px] font-medium text-cyan-300/40">
            In progress
          </span>
        )}
      </div>
    ))}
    {/* Progress bar */}
    <div className="mt-2 px-3">
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.04]">
        <div className="h-full w-[45%] rounded-full bg-gradient-to-r from-cyan-400/40 to-cyan-400/20" />
      </div>
      <p className="mt-1.5 text-[8px] tabular-nums text-white/18">
        10 / 22 lessons completed
      </p>
    </div>
  </div>
);

/* ——— Mini visual for Simulations card ——— */
const SimVisual = () => (
  <div className="mt-5">
    <svg
      viewBox="0 0 200 64"
      className="w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Edges */}
      <line x1="30" y1="28" x2="100" y2="18" stroke="rgba(34,211,238,0.15)" strokeWidth="1" />
      <line x1="100" y1="18" x2="170" y2="28" stroke="rgba(34,211,238,0.15)" strokeWidth="1" />
      <line x1="30" y1="28" x2="100" y2="42" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      <line x1="100" y1="42" x2="170" y2="28" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      {/* Nodes */}
      <circle cx="30" cy="28" r="5" fill="rgba(34,211,238,0.1)" stroke="rgba(34,211,238,0.3)" strokeWidth="0.8" />
      <circle cx="100" cy="18" r="4" fill="rgba(59,130,246,0.1)" stroke="rgba(59,130,246,0.25)" strokeWidth="0.8" />
      <circle cx="100" cy="42" r="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />
      <circle cx="170" cy="28" r="5" fill="rgba(34,211,238,0.1)" stroke="rgba(34,211,238,0.3)" strokeWidth="0.8" />
      {/* Labels */}
      <text x="30" y="54" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.2)" fontFamily="monospace" letterSpacing="0.5">SRC</text>
      <text x="170" y="54" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.2)" fontFamily="monospace" letterSpacing="0.5">DST</text>
    </svg>
    <div className="mt-2 flex gap-1.5">
      {["TCP", "Routing", "Congestion"].map((tag) => (
        <span
          key={tag}
          className="rounded-md border border-white/[0.05] bg-white/[0.02] px-2 py-0.5 text-[8px] font-medium text-white/25"
        >
          {tag}
        </span>
      ))}
    </div>
  </div>
);

/* ——— Mini visual for Exam card ——— */
const ExamVisual = () => (
  <div className="mt-5 space-y-2">
    {[
      { q: "Q1", topic: "Transport Layer", difficulty: "Medium" },
      { q: "Q2", topic: "Network Layer", difficulty: "Hard" },
      { q: "Q3", topic: "Application Layer", difficulty: "Easy" },
    ].map((item) => (
      <div
        key={item.q}
        className="flex items-center gap-2.5 rounded-lg border border-white/[0.04] bg-white/[0.015] px-3 py-1.5"
      >
        <span className="text-[10px] font-semibold tabular-nums text-white/30">
          {item.q}
        </span>
        <span className="text-[9px] text-white/25">{item.topic}</span>
        <span
          className={`ml-auto rounded-full px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.08em] ${
            item.difficulty === "Hard"
              ? "bg-red-400/[0.08] text-red-300/50"
              : item.difficulty === "Medium"
                ? "bg-amber-400/[0.08] text-amber-300/50"
                : "bg-emerald-400/[0.08] text-emerald-300/50"
          }`}
        >
          {item.difficulty}
        </span>
      </div>
    ))}
  </div>
);

/* ——— Feature data ——— */
const features = [
  {
    id: "chat",
    icon: MessageSquare,
    title: "AI Chat",
    subtitle: "Course-grounded answers",
    description:
      "Ask ELEC3120 questions and get structured responses with citations to lecture slides and textbook sections.",
    visual: ChatVisual,
  },
  {
    id: "course",
    icon: BookOpen,
    title: "Guided Lessons",
    subtitle: "11 sections \u00b7 22 lessons",
    description:
      "Study through a structured lesson layout with per-slide AI explanations and tracked progress.",
    visual: LessonsVisual,
  },
  {
    id: "simulations",
    icon: Activity,
    title: "Protocol Simulations",
    subtitle: "18 interactive visuals",
    description:
      "See TCP handshakes, sliding windows, routing, and congestion control as animated visual systems.",
    visual: SimVisual,
  },
  {
    id: "exam",
    icon: FileText,
    title: "Mock Exams",
    subtitle: "Targeted generation",
    description:
      "Generate topic-specific practice papers with configurable difficulty and scope for focused revision.",
    visual: ExamVisual,
  },
];

/* ——— Main component ——— */
const ModesShowcase = () => {
  const navigate = useNavigate();

  return (
    <section id="features" className="px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-xl"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300/60">
            Platform Modes
          </p>
          <h2 className="mt-3 font-display text-[2rem] font-bold tracking-[-0.03em] text-white sm:text-[2.5rem]">
            Four ways to study
          </h2>
          <p className="mt-3 text-[15px] leading-[1.7] text-white/45">
            Chat, study, simulate, and practice — each mode is designed for a
            different part of the revision workflow.
          </p>
        </motion.div>

        {/* 2×2 Bento grid */}
        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {features.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{
                duration: 0.45,
                delay: index * 0.06,
                ease: "easeOut",
              }}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[rgba(8,16,32,0.6)] p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-400/[0.12] hover:bg-[rgba(10,20,40,0.7)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3),0_0_0_1px_rgba(34,211,238,0.04)]"
            >
              {/* Top accent line — shifts cyan on hover */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent transition-opacity duration-300 group-hover:opacity-0" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/[0.2] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/[0.07] ring-1 ring-cyan-400/[0.1] transition-colors duration-300 group-hover:bg-cyan-400/[0.12] group-hover:ring-cyan-400/[0.18]">
                    <feature.icon className="h-4 w-4 text-cyan-300/70 transition-colors duration-300 group-hover:text-cyan-200/90" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-white/85">
                      {feature.title}
                    </h3>
                    <p className="text-[10px] font-medium text-white/30">
                      {feature.subtitle}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigate("/platform", { state: { mode: feature.id } })
                  }
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/25 opacity-0 transition-all group-hover:opacity-100 group-hover:text-white/50"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Description */}
              <p className="mt-3 text-[12px] leading-[1.65] text-white/38">
                {feature.description}
              </p>

              {/* Mini visual */}
              <feature.visual />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ModesShowcase;
