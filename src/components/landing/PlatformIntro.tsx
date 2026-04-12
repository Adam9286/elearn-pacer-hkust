import { motion } from "framer-motion";
import { BookOpen, CheckCircle2, FileText, MessageSquare, Shield } from "lucide-react";

const differentiators = [
  {
    icon: MessageSquare,
    title: "Course-grounded answers",
    description: "The platform is designed around ELEC3120 materials instead of broad generic knowledge.",
  },
  {
    icon: BookOpen,
    title: "Structured revision flow",
    description: "Move from guided lessons into questions, simulations, and practice without leaving the product.",
  },
  {
    icon: FileText,
    title: "Assessment-oriented support",
    description: "Mock exams and focused review help you prepare for the way the course is actually assessed.",
  },
];

const supportingSignals = [
  "Grounded in ELEC3120 lecture material and course context",
  "Designed for revision clarity, not vague AI novelty",
  "Combines chat, lessons, simulations, and exam practice in one workflow",
  "Built as a polished final year project product, not a toy demo",
];

const PlatformIntro = () => {
  return (
    <section className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(6,14,27,0.92),rgba(4,10,19,0.88))] px-6 py-8 shadow-[0_30px_120px_rgba(2,12,27,0.3)] sm:px-8 sm:py-10 lg:px-10"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.08),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.12),transparent_30%)]" />

          <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-start">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200/80">
                Credibility and Differentiation
              </p>
              <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">
                Not just another AI chatbot
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/68">
                LearningPacer is built for ELEC3120 revision. It combines course-grounded AI assistance,
                guided lessons, interactive protocol visuals, and mock exam practice so the learning flow
                stays aligned with how the course is actually taught.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100">
                  Course grounding over generic breadth
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/60">
                  Revision-first workflow
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/60">
                  Simulations inside the same platform
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {differentiators.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, delay: index * 0.08, ease: "easeOut" }}
                  className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                      <item.icon className="h-5 w-5 text-cyan-200" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-white/58">{item.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="relative mt-10 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-[#07101e]/88 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                  <Shield className="h-5 w-5 text-cyan-200" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/42">
                    Why It Feels Different
                  </p>
                  <p className="mt-1 text-base font-semibold text-white">Closer to the course, easier to revise from</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {supportingSignals.map((signal) => (
                <div
                  key={signal}
                  className="flex items-start gap-3 rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/60"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-200" />
                  <span>{signal}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PlatformIntro;
