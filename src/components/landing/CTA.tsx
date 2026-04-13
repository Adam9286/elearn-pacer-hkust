import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CTA = () => {
  const navigate = useNavigate();

  return (
    <section className="px-4 py-28 sm:px-6 lg:px-8 lg:py-36">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="font-display text-[2rem] font-bold tracking-[-0.03em] text-white sm:text-[2.5rem] lg:text-[2.75rem]">
            Built for ELEC3120.
            <br />
            <span className="text-white/50">
              Designed for independent mastery.
            </span>
          </h2>

          <p className="mt-5 text-[15px] leading-[1.75] text-white/40">
            From quick questions to structured revision — chat, study,
            simulate, and practice in one focused workflow.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => navigate("/platform")}
              className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-cyan-400 px-7 py-3 text-[13px] font-semibold text-[#040c1b] shadow-[0_0_20px_rgba(34,211,238,0.2),0_2px_8px_rgba(0,0,0,0.3)] transition-all hover:-translate-y-px hover:bg-cyan-300 hover:shadow-[0_0_28px_rgba(34,211,238,0.3),0_4px_12px_rgba(0,0,0,0.3)]"
            >
              Launch LearningPacer
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
          </div>

          {/* Subtle signal chips */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {["Course-grounded", "Simulation-backed", "Revision-focused"].map(
              (signal) => (
                <span
                  key={signal}
                  className="rounded-full border border-white/[0.05] bg-white/[0.015] px-3.5 py-1.5 text-[11px] font-medium text-white/30"
                >
                  {signal}
                </span>
              ),
            )}
          </div>
        </motion.div>

        {/* Divider */}
        <div className="mx-auto mt-20 h-px max-w-xs bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>
    </section>
  );
};

export default CTA;
