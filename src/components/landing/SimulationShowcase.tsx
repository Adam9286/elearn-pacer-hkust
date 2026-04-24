import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { LANDING_SECTION_SCROLL_MARGIN } from "@/constants/landing";
import {
  simulationCatalog,
  simulationModuleDescriptions,
  simulationModuleOrder,
  totalSimulationCount,
  type SimulationDifficulty,
} from "@/data/platformContent";

import AmbientNetwork from "./AmbientNetwork";

const subtleReveal = {
  initial: { opacity: 0.88, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.12 },
  transition: { duration: 0.45, ease: "easeOut" as const },
};

const difficultyAccent: Record<SimulationDifficulty, string> = {
  Introductory: "#22d3ee",
  Intermediate: "#f97316",
  Advanced: "#a78bfa",
};

const SimulationShowcase = () => {
  const [activeModuleIndex, setActiveModuleIndex] = useState(1);

  const modules = useMemo(
    () =>
      simulationModuleOrder.map((moduleName) => {
        const labs = simulationCatalog.filter((entry) => entry.module === moduleName);
        const counts = labs.reduce<Record<SimulationDifficulty, number>>(
          (acc, lab) => {
            acc[lab.difficulty] += 1;
            return acc;
          },
          { Introductory: 0, Intermediate: 0, Advanced: 0 },
        );

        return {
          moduleName,
          description: simulationModuleDescriptions[moduleName],
          labs,
          counts,
        };
      }),
    [],
  );

  const activeModule = modules[activeModuleIndex];

  return (
    <section
      id="simulations"
      style={{
        padding: "6rem clamp(1rem, 3vw, 2.5rem)",
        background: "#060d1f",
        borderTop: "1px solid rgba(34,211,238,0.1)",
        position: "relative",
        overflow: "hidden",
        scrollMarginTop: LANDING_SECTION_SCROLL_MARGIN,
      }}
    >
      <AmbientNetwork style={{ opacity: 0.05 }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <motion.p
          {...subtleReveal}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#f97316",
            marginBottom: "0.8rem",
          }}
        >
          SIMULATIONS HUB
        </motion.p>
        <motion.h2
          {...subtleReveal}
          transition={{ ...subtleReveal.transition, delay: 0.06 }}
          style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: "clamp(1.9rem, 3.5vw, 3rem)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            color: "#f0f4ff",
            marginBottom: "1rem",
            lineHeight: 1.05,
            maxWidth: 760,
          }}
        >
          Simulations that match the real platform hub.
        </motion.h2>

        <div className="lp-sim-grid">
          <div>
            <motion.p
              {...subtleReveal}
              transition={{ ...subtleReveal.transition, delay: 0.12 }}
              style={{
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: "0.98rem",
                color: "#6e82a4",
                lineHeight: 1.65,
                marginBottom: "1.5rem",
              }}
            >
              LearningPacer groups {totalSimulationCount} interactive ELEC3120 labs into four real modules: Foundations, Transport Layer, Network Layer, and Link Layer. This preview mirrors the actual simulations tab instead of inventing a separate landing-page style.
            </motion.p>

            {[
              ["Real module structure", "The same four-group layout you open inside the platform."],
              ["Real lab names", "DNS Resolution, Sliding Window, Dijkstra, STP, Queue Management, and more."],
              ["Real destination", "The CTA below jumps straight into the actual simulations mode."],
            ].map(([title, description], index) => (
              <motion.div
                key={title}
                {...subtleReveal}
                transition={{ ...subtleReveal.transition, delay: 0.16 + index * 0.05 }}
                style={{ display: "flex", gap: 10, marginBottom: "1.1rem" }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#22d3ee",
                    flexShrink: 0,
                    marginTop: 8,
                  }}
                />
                <div>
                  <div
                    style={{
                      fontFamily: "'Inter Tight', sans-serif",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#f0f4ff",
                      marginBottom: 2,
                    }}
                  >
                    {title}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Inter Tight', sans-serif",
                      fontSize: 12,
                      color: "#6e82a4",
                      lineHeight: 1.5,
                    }}
                  >
                    {description}
                  </div>
                </div>
              </motion.div>
            ))}

            <motion.div
              {...subtleReveal}
              transition={{ ...subtleReveal.transition, delay: 0.3 }}
              style={{ display: "flex", flexWrap: "wrap", gap: 10, margin: "1.6rem 0" }}
            >
              {[`${totalSimulationCount} labs`, `${simulationModuleOrder.length} modules`, "Intro to advanced"].map((chip) => (
                <span
                  key={chip}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(34,211,238,0.18)",
                    background: "rgba(34,211,238,0.06)",
                    color: "#d9e7ff",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {chip}
                </span>
              ))}
            </motion.div>

            <motion.div {...subtleReveal} transition={{ ...subtleReveal.transition, delay: 0.34 }}>
              <Link
                to="/platform"
                state={{ mode: "simulations" }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  marginTop: "0.25rem",
                  padding: "10px 18px",
                  background: "rgba(34,211,238,0.07)",
                  border: "1px solid rgba(34,211,238,0.18)",
                  borderRadius: 7,
                  color: "#22d3ee",
                  fontFamily: "'Inter Tight', sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  transition: "background .2s ease, gap .2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(34,211,238,0.13)";
                  e.currentTarget.style.gap = "11px";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(34,211,238,0.07)";
                  e.currentTarget.style.gap = "7px";
                }}
              >
                Explore all simulations
                <ArrowRight size={13} strokeWidth={2.5} />
              </Link>
            </motion.div>
          </div>

          <motion.div
            {...subtleReveal}
            transition={{ ...subtleReveal.transition, delay: 0.2 }}
            style={{
              border: "1px solid rgba(34,211,238,0.1)",
              borderRadius: 14,
              overflow: "hidden",
              background: "rgba(6,13,31,0.88)",
              boxShadow: "0 30px 80px -40px rgba(34,211,238,0.22)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.8rem 0.95rem",
                borderBottom: "1px solid rgba(34,211,238,0.1)",
                background: "rgba(255,255,255,0.015)",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {["#ff5f57", "#febc2e", "#28c840"].map((color) => (
                    <div key={color} style={{ width: 9, height: 9, borderRadius: "50%", background: color, opacity: 0.65 }} />
                  ))}
                </div>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: "rgba(240,244,255,0.48)",
                  }}
                >
                  Simulation Hub Preview
                </span>
              </div>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  color: "rgba(34,211,238,0.7)",
                  background: "rgba(34,211,238,0.07)",
                  padding: "2px 7px",
                  borderRadius: 999,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {totalSimulationCount} live labs
              </span>
            </div>

            <div style={{ padding: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8, marginBottom: "1rem" }}>
                {modules.map((module, index) => {
                  const active = index === activeModuleIndex;
                  return (
                    <button
                      key={module.moduleName}
                      type="button"
                      onClick={() => setActiveModuleIndex(index)}
                      style={{
                        textAlign: "left",
                        borderRadius: 10,
                        border: `1px solid ${active ? "rgba(34,211,238,0.28)" : "rgba(255,255,255,0.08)"}`,
                        background: active ? "rgba(34,211,238,0.07)" : "rgba(255,255,255,0.02)",
                        padding: "0.8rem 0.85rem",
                        cursor: "pointer",
                        transition: "border-color .2s ease, background .2s ease, transform .2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "rgba(34,211,238,0.28)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = active ? "rgba(34,211,238,0.28)" : "rgba(255,255,255,0.08)";
                        e.currentTarget.style.transform = "none";
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontFamily: "'JetBrains Mono', monospace",
                          color: active ? "#22d3ee" : "rgba(240,244,255,0.45)",
                          marginBottom: 4,
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                        }}
                      >
                        Module {index + 1}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Inter Tight', sans-serif",
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#f0f4ff",
                          marginBottom: 4,
                        }}
                      >
                        {module.moduleName}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Inter Tight', sans-serif",
                          fontSize: 11,
                          lineHeight: 1.45,
                          color: "#6e82a4",
                        }}
                      >
                        {module.description}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.02)",
                  padding: "1rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: "0.8rem" }}>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: "#22d3ee",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      {activeModule.moduleName}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Inter Tight', sans-serif",
                        fontSize: 13,
                        color: "#6e82a4",
                        lineHeight: 1.55,
                        maxWidth: 420,
                      }}
                    >
                      {activeModule.description}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(Object.keys(activeModule.counts) as SimulationDifficulty[]).map((difficulty) =>
                      activeModule.counts[difficulty] > 0 ? (
                        <span
                          key={difficulty}
                          style={{
                            padding: "5px 8px",
                            borderRadius: 999,
                            background: `${difficultyAccent[difficulty]}14`,
                            border: `1px solid ${difficultyAccent[difficulty]}33`,
                            color: "#d9e7ff",
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 10,
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                          }}
                        >
                          {difficulty} {activeModule.counts[difficulty]}
                        </span>
                      ) : null,
                    )}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 8 }}>
                  {activeModule.labs.map((lab) => (
                    <div
                      key={lab.id}
                      style={{
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.06)",
                        background: "rgba(3,8,22,0.55)",
                        padding: "0.75rem 0.8rem",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'Inter Tight', sans-serif",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#f0f4ff",
                          marginBottom: 4,
                        }}
                      >
                        {lab.label}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Inter Tight', sans-serif",
                          fontSize: 11,
                          lineHeight: 1.45,
                          color: "#6e82a4",
                        }}
                      >
                        {lab.summary}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SimulationShowcase;
