import { motion } from "framer-motion";
import { Activity, ArrowRight, BookOpen, FileText, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

const features = [
  {
    id: "chat",
    icon: MessageSquare,
    title: "Chat Mode",
    metric: "Course-grounded answers",
    description:
      "Ask ELEC3120 questions in plain language and get structured responses designed for revision instead of vague generic explanations.",
    bullets: [
      "Focused on course-specific context",
      "Built for follow-up questions and study flow",
      "Better aligned to networking topics you actually revise",
    ],
  },
  {
    id: "course",
    icon: BookOpen,
    title: "Course Mode",
    metric: "11 sections · 22 lessons",
    description:
      "Study through a structured lesson layout instead of bouncing between scattered notes, tabs, and screenshots.",
    bullets: [
      "Guided progression through the course",
      "Clearer review path before exams",
      "Designed for independent mastery",
    ],
  },
  {
    id: "simulations",
    icon: Activity,
    title: "Simulations",
    metric: "17 interactive visuals",
    description:
      "Make packet flow, retransmission, routing, congestion control, and other network concepts visible enough to reason about.",
    bullets: [
      "Step-by-step protocol behavior",
      "Visual intuition for abstract concepts",
      "A signature differentiator of the product",
    ],
  },
  {
    id: "exam",
    icon: FileText,
    title: "Mock Exam Mode",
    metric: "Targeted practice generation",
    description:
      "Generate practice material by topic so revision stays focused on the parts of ELEC3120 you actually need to strengthen.",
    bullets: [
      "Topic-oriented revision support",
      "Exam-style practice inside the platform",
      "Fits naturally into the same study workflow",
    ],
  },
];

const workflowSteps = ["Ask", "Study", "Simulate", "Practice"];

const ModesShowcase = () => {
  const navigate = useNavigate();

  const openMode = (mode: string) => {
    navigate("/platform", { state: { mode } });
  };

  return (
    <section id="features" className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200/80">
            Feature Architecture
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">
            Four ways to master the course
          </h2>
          <p className="mt-5 text-lg leading-8 text-white/64">
            LearningPacer is strongest when the pieces work together. You can ask, study, simulate, and
            practice without leaving the same product or losing the course context.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: index * 0.06, ease: "easeOut" }}
              className="group flex h-full flex-col rounded-[28px] border border-white/10 bg-white/[0.035] p-6 shadow-[0_22px_70px_rgba(2,12,27,0.2)] backdrop-blur transition-transform hover:-translate-y-1 hover:border-cyan-300/20"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                  <feature.icon className="h-5 w-5 text-cyan-200" />
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
                  {feature.metric}
                </span>
              </div>

              <div className="mt-6">
                <h3 className="text-2xl font-semibold tracking-[-0.03em] text-white">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/58">{feature.description}</p>
              </div>

              <div className="mt-6 space-y-3">
                {feature.bullets.map((bullet) => (
                  <div key={bullet} className="flex items-start gap-3 text-sm text-white/62">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-200" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => openMode(feature.id)}
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-cyan-100 transition-colors hover:text-white"
              >
                Open {feature.title}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mt-10 rounded-[28px] border border-white/10 bg-[#06101f]/82 p-5 backdrop-blur"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/42">
                Unified Study Workflow
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                One platform, four steps that naturally fit together
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {workflowSteps.map((step, index) => (
                <div key={step} className="flex items-center gap-3">
                  <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/68">
                    {step}
                  </div>
                  {index < workflowSteps.length - 1 && (
                    <ArrowRight className="hidden h-4 w-4 text-white/28 sm:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ModesShowcase;
