import { motion } from "framer-motion";
import { ArrowRight, GitCompareArrows } from "lucide-react";
import { Link } from "react-router-dom";

import { LANDING_SECTION_SCROLL_MARGIN } from "@/constants/landing";
import { platformModeSummaries } from "@/data/platformContent";

const Testimonial = () => {
  return (
    <section
      id="compare"
      style={{
        padding: "4.5rem clamp(1rem, 3vw, 2.5rem)",
        borderTop: "1px solid rgba(34,211,238,0.1)",
        scrollMarginTop: LANDING_SECTION_SCROLL_MARGIN,
      }}
    >
      <motion.div
        initial={{ opacity: 0.9, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{
          maxWidth: 760,
          margin: "0 auto",
          borderRadius: 20,
          border: "1px solid rgba(245,158,11,0.16)",
          background: "linear-gradient(180deg, rgba(245,158,11,0.08), rgba(15,23,32,0.9))",
          padding: "1.5rem",
          boxShadow: "0 24px 70px -45px rgba(245,158,11,0.45)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "0.9rem" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.24)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <GitCompareArrows size={18} color="#f59e0b" />
          </div>
          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: "#f59e0b",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 2,
              }}
            >
              ALSO AVAILABLE IN THE PLATFORM
            </div>
            <div
              style={{
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 22,
                fontWeight: 800,
                color: "#f0f4ff",
                letterSpacing: "-0.03em",
              }}
            >
              {platformModeSummaries.compare.label} answers side by side.
            </div>
          </div>
        </div>

        <p
          style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 15,
            lineHeight: 1.65,
            color: "rgba(240,244,255,0.78)",
            marginBottom: "1.1rem",
          }}
        >
          When you want to show the difference between a grounded ELEC3120 response and a general-purpose AI answer, open {platformModeSummaries.compare.label} mode. It stays secondary on the landing page, but it is a real part of the product.
        </p>

        <Link
          to="/platform"
          state={{ mode: "compare" }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderRadius: 999,
            border: "1px solid rgba(245,158,11,0.22)",
            background: "rgba(245,158,11,0.08)",
            color: "#ffd9a3",
            textDecoration: "none",
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 14,
            fontWeight: 700,
            transition: "gap .2s ease, background .2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.gap = "12px";
            e.currentTarget.style.background = "rgba(245,158,11,0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.gap = "8px";
            e.currentTarget.style.background = "rgba(245,158,11,0.08)";
          }}
        >
          Open compare mode
          <ArrowRight size={15} strokeWidth={2.5} />
        </Link>
      </motion.div>
    </section>
  );
};

export default Testimonial;
