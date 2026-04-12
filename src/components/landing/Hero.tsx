import { motion } from "framer-motion";
import { Activity, ArrowRight, BookOpen, FileText, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NetworkHeroVisual from "./NetworkHeroVisual";

const proofMetrics = [
  { value: "57/60", label: "validated queries" },
  { value: "17", label: "interactive simulations" },
  { value: "11 / 22", label: "sections and lessons" },
  { value: "< 2 min", label: "mock exam generation" },
];

const heroSignals = [
  { icon: MessageSquare, label: "Course-grounded AI chat" },
  { icon: BookOpen, label: "Guided lessons" },
  { icon: Activity, label: "Protocol simulations" },
  { icon: FileText, label: "Exam-style practice" },
];

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-5 sm:px-6 lg:px-8 lg:pb-24">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-3 shadow-[0_18px_50px_rgba(2,12,27,0.22)] backdrop-blur xl:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/10 shadow-[0_0_28px_rgba(34,211,238,0.18)]">
                <Activity className="h-5 w-5 text-cyan-200" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight text-white">LearningPacer</p>
                <p className="text-xs uppercase tracking-[0.28em] text-white/45">
                  ELEC3120 Computer Networks
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
                Course-specific AI learning platform
              </div>
              <button
                type="button"
                onClick={() => navigate("/auth")}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-14 pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(540px,0.95fr)] lg:items-center lg:pt-20">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-100/90"
            >
              Built for revision, not generic prompting
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05, ease: "easeOut" }}
              className="mt-8 text-5xl font-semibold leading-[0.95] tracking-[-0.04em] text-white sm:text-6xl xl:text-7xl"
            >
              Learn Computer Networks the way ELEC3120 teaches it
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12, ease: "easeOut" }}
              className="mt-6 max-w-xl text-lg leading-8 text-white/68 sm:text-xl"
            >
              Course-grounded AI chat, guided lessons, interactive simulations, and mock exam generation in
              one focused study platform for ELEC3120.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.18, ease: "easeOut" }}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <button
                type="button"
                onClick={() => navigate("/platform")}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-300 px-6 py-3.5 text-sm font-semibold text-slate-950 transition-transform hover:-translate-y-0.5 hover:bg-cyan-200"
              >
                Explore the Platform
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/platform", { state: { mode: "simulations" } })}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-6 py-3.5 text-sm font-semibold text-white/80 transition-colors hover:border-cyan-300/25 hover:bg-white/[0.06] hover:text-white"
              >
                View Simulations
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24, ease: "easeOut" }}
              className="mt-8 flex flex-wrap gap-2"
            >
              {heroSignals.map((signal) => (
                <div
                  key={signal.label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2 text-sm text-white/62 backdrop-blur"
                >
                  <signal.icon className="h-4 w-4 text-cyan-200" />
                  <span>{signal.label}</span>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.3, ease: "easeOut" }}
              className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            >
              {proofMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-[24px] border border-white/10 bg-white/[0.035] px-4 py-4 shadow-[0_20px_50px_rgba(2,12,27,0.18)] backdrop-blur"
                >
                  <div className="text-2xl font-semibold tracking-[-0.03em] text-white">{metric.value}</div>
                  <div className="mt-1 text-sm text-white/52">{metric.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
            className="relative"
          >
            <div className="absolute -left-10 top-16 hidden h-32 w-32 rounded-full bg-cyan-400/16 blur-3xl lg:block" />
            <div className="absolute -bottom-10 right-10 hidden h-40 w-40 rounded-full bg-blue-500/16 blur-3xl lg:block" />
            <NetworkHeroVisual />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
