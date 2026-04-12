import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

const genericAiPoints = [
  "Broad knowledge, but not tuned to ELEC3120 revision priorities",
  "Explanations may sound polished without matching the course structure",
  "No built-in path from question to lesson to protocol visualization",
  "No dedicated simulation layer for making network behavior visible",
];

const learningPacerPoints = [
  "Built around ELEC3120 context rather than generic breadth",
  "Supports structured study through lessons, simulations, and practice",
  "Makes networking concepts easier to reason about through visual flow",
  "Keeps revision inside one focused product instead of scattered tools",
];

const ComparisonSection = () => {
  return (
    <section id="comparison" className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200/80">
            Revision Positioning
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">
            Better for ELEC3120 revision than general-purpose AI
          </h2>
          <p className="mt-5 text-lg leading-8 text-white/64">
            The value is not that LearningPacer knows everything. The value is that it is built to support
            one course well, with the structure, visuals, and practice flow that revision actually needs.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/42">
              General-purpose AI
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-white">Strong at breadth, weaker at course fit</h3>
            <div className="mt-6 space-y-4">
              {genericAiPoints.map((point) => (
                <div key={point} className="flex items-start gap-3 text-sm leading-7 text-white/58">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white/30" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: 0.06, ease: "easeOut" }}
            className="rounded-[28px] border border-cyan-300/20 bg-cyan-400/10 p-6 backdrop-blur"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/80">
              LearningPacer
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-white">Focused on the way ELEC3120 is learned</h3>
            <div className="mt-6 space-y-4">
              {learningPacerPoints.map((point) => (
                <div key={point} className="flex items-start gap-3 text-sm leading-7 text-white/70">
                  <CheckCircle2 className="mt-1 h-4 w-4 flex-shrink-0 text-cyan-200" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;
