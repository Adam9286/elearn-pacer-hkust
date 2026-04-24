import { motion } from "framer-motion";

import { LANDING_SECTION_SCROLL_MARGIN } from "@/constants/landing";
import { platformModeSummaries, totalSimulationCount } from "@/data/platformContent";

import AmbientNetwork from "./AmbientNetwork";
import StatCell from "./StatCell";

const subtleReveal = {
  initial: { opacity: 0.9, y: 10 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.12 },
  transition: { duration: 0.4, ease: "easeOut" as const },
};

const platformModeCount = Object.keys(platformModeSummaries).length;

const ProofSection = () => {
  return (
    <section
      id="proof"
      style={{
        padding: "5rem clamp(1rem, 3vw, 2.5rem)",
        borderTop: "1px solid rgba(34,211,238,0.1)",
        borderBottom: "1px solid rgba(34,211,238,0.1)",
        background: "rgba(255,255,255,0.01)",
        position: "relative",
        overflow: "hidden",
        scrollMarginTop: LANDING_SECTION_SCROLL_MARGIN,
      }}
    >
      <AmbientNetwork style={{ opacity: 0.06 }} />

      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <motion.p
          {...subtleReveal}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#f97316",
            marginBottom: "0.8rem",
            textAlign: "center",
          }}
        >
          WHAT YOU CAN VERIFY LIVE
        </motion.p>
        <motion.h2
          {...subtleReveal}
          transition={{ ...subtleReveal.transition, delay: 0.06 }}
          style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: "clamp(1.75rem, 3vw, 2.75rem)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            color: "#f0f4ff",
            marginBottom: "0.5rem",
            textAlign: "center",
          }}
        >
          Grounded product facts, not marketing estimates.
        </motion.h2>
        <motion.p
          {...subtleReveal}
          transition={{ ...subtleReveal.transition, delay: 0.12 }}
          style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: "0.95rem",
            color: "#6e82a4",
            textAlign: "center",
            marginBottom: "3rem",
            maxWidth: 680,
            marginInline: "auto",
            lineHeight: 1.6,
          }}
        >
          This section now highlights real platform scope you can demonstrate immediately instead of unverifiable student-growth claims.
        </motion.p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
            gap: 1,
            background: "rgba(34,211,238,0.1)",
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid rgba(34,211,238,0.1)",
          }}
        >
          <StatCell value={String(platformModeCount)} label="Platform Modes" sub="chat, compare, course, exam, simulations" color="#22d3ee" ring={100} delay={1} />
          <StatCell value={String(totalSimulationCount)} label="Interactive Labs" sub="foundations through link layer" color="#f97316" ring={100} delay={2} />
          <StatCell value="4" label="Core Booth Flows" sub="chat, course, sims, mock exam" color="#22d3ee" ring={100} delay={3} />
          <StatCell value="1" label="Course Focus" sub="built around ELEC3120" color="#f97316" ring={100} delay={4} />
        </div>

        <motion.p
          {...subtleReveal}
          transition={{ ...subtleReveal.transition, delay: 0.16 }}
          style={{
            textAlign: "center",
            marginTop: "1.25rem",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: "rgba(138,154,184,0.35)",
            letterSpacing: "0.05em",
          }}
        >
          Counts reflect the current product build you are demoing at the booth.
        </motion.p>
      </div>
    </section>
  );
};

export default ProofSection;
