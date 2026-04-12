import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const closingSignals = [
  "Course-grounded",
  "Simulation-backed",
  "Revision-focused",
];

const CTA = () => {
  const navigate = useNavigate();

  return (
    <section className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,18,33,0.96),rgba(5,10,20,0.92))] px-6 py-10 text-center shadow-[0_30px_140px_rgba(2,12,27,0.34)] sm:px-10 sm:py-12"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(34,211,238,0.14),transparent_28%),radial-gradient(circle_at_75%_15%,rgba(59,130,246,0.18),transparent_30%),radial-gradient(circle_at_50%_120%,rgba(34,211,238,0.12),transparent_40%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20" />

          <div className="relative mx-auto max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200/80">
              Final Call to Action
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
              Built for ELEC3120. Designed for independent mastery.
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/64">
              Move from quick questions to structured lessons, protocol simulations, and exam practice in
              one focused revision workflow.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate("/platform")}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-300 px-6 py-3.5 text-sm font-semibold text-slate-950 transition-transform hover:-translate-y-0.5 hover:bg-cyan-200"
              >
                Launch LearningPacer
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/platform", { state: { mode: "simulations" } })}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-white/80 transition-colors hover:border-cyan-300/25 hover:bg-white/[0.06] hover:text-white"
              >
                View Simulations
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {closingSignals.map((signal) => (
                <div
                  key={signal}
                  className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-sm font-medium text-white/64"
                >
                  {signal}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
