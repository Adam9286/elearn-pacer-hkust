import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { LANDING_SECTION_SCROLL_MARGIN } from "@/constants/landing";
import { platformModeSummaries, totalSimulationCount } from "@/data/platformContent";

const CTA = () => {
  return (
    <section
      id="cta"
      style={{
        padding: "8rem clamp(1rem, 3vw, 2.5rem)",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
        scrollMarginTop: LANDING_SECTION_SCROLL_MARGIN,
      }}
    >
      <div
        className="animate-lp-drift"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(34,211,238,0.055), transparent 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 30% 30% at 30% 70%, rgba(249,115,22,0.025), transparent 60%)",
        }}
      />

      <div style={{ position: "relative", maxWidth: 700, margin: "0 auto" }}>
        <motion.p
          initial={{ opacity: 0.9, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.12 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#f97316",
            marginBottom: "1rem",
          }}
        >
          READY TO DEMO?
        </motion.p>
        <motion.h2
          initial={{ opacity: 0.9, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.12 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.06 }}
          style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: "clamp(2rem, 4.5vw, 3.75rem)",
            fontWeight: 900,
            letterSpacing: "-0.045em",
            color: "#f0f4ff",
            lineHeight: 1.0,
            marginBottom: "1rem",
          }}
        >
          Open the full ELEC3120 study stack.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0.9, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.12 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.12 }}
          style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: "1rem",
            color: "#6e82a4",
            marginBottom: "2.25rem",
            lineHeight: 1.6,
          }}
        >
          Sign in to explore {platformModeSummaries.chat.label}, {platformModeSummaries.course.label}, {platformModeSummaries.simulations.label}, {platformModeSummaries.exam.label}, and {platformModeSummaries.compare.label} in one place.
        </motion.p>

        <motion.div
          initial={{ opacity: 0.9, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.12 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.18 }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}
        >
          <Link
            to="/auth"
            className="animate-lp-cyan-pulse"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              padding: "14px 30px",
              background: "#22d3ee",
              color: "#030816",
              borderRadius: 8,
              fontFamily: "'Inter Tight', sans-serif",
              fontWeight: 800,
              fontSize: 15,
              textDecoration: "none",
              letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
              transition: "opacity .2s ease, transform .2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.87";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "none";
            }}
          >
            Start learning now
            <ArrowRight size={15} strokeWidth={2.5} color="#030816" />
          </Link>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "1rem" }}>
            {[`${Object.keys(platformModeSummaries).length} study modes`, `${totalSimulationCount} simulations`, "Course-grounded chat"].map((item) => (
              <span
                key={item}
                style={{
                  fontSize: 11,
                  color: "#6e82a4",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
