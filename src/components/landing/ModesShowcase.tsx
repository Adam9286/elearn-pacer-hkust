import { motion } from "framer-motion";
import { BookOpen, ClipboardList, MessageSquare, Zap } from "lucide-react";
import { useState, type ComponentType } from "react";

import { LANDING_SECTION_SCROLL_MARGIN } from "@/constants/landing";
import { landingPrimaryModeIds, platformModeSummaries, type PlatformModeId } from "@/data/platformContent";

import ChatCard from "./modes/ChatCard";
import CourseCard from "./modes/CourseCard";
import ExamCard from "./modes/ExamCard";
import SimCard from "./modes/SimCard";

type CardBody = ComponentType<{ hovered: boolean }>;
type CardDef = {
  key: PlatformModeId;
  Icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  Body: CardBody;
};

const cardBodies: Record<PlatformModeId, CardBody | undefined> = {
  chat: ChatCard,
  compare: undefined,
  course: CourseCard,
  exam: ExamCard,
  simulations: SimCard,
};

const cardIcons: Record<PlatformModeId, ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  chat: MessageSquare,
  compare: MessageSquare,
  course: BookOpen,
  exam: ClipboardList,
  simulations: Zap,
};

const cardDefs: CardDef[] = landingPrimaryModeIds.map((modeId) => ({
  key: modeId,
  Icon: cardIcons[modeId],
  Body: cardBodies[modeId]!,
}));

const subtleReveal = {
  initial: { opacity: 0.88, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.12 },
  transition: { duration: 0.45, ease: "easeOut" as const },
};

const ModeCard = ({ Icon, Body, index, modeId }: CardDef & { index: number; modeId: PlatformModeId }) => {
  const [hovered, setHovered] = useState(false);
  const summary = platformModeSummaries[modeId];

  return (
    <motion.div
      initial={{ opacity: 0.9, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.45, ease: "easeOut", delay: 0.06 * index }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 16,
        border: `1px solid ${hovered ? `${summary.accent}66` : "rgba(34,211,238,0.1)"}`,
        background: "#0f1720",
        transform: hovered ? "translateY(-2px)" : "none",
        transition: "border-color .24s ease-out, transform .24s ease-out, box-shadow .24s ease-out",
        boxShadow: hovered ? `0 20px 60px -20px ${summary.accent}4d` : "none",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minHeight: 420,
        position: "relative",
      }}
    >
      <div
        style={{
          padding: "20px 20px 14px",
          display: "flex",
          alignItems: "center",
          gap: 9,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `${summary.accent}14`,
            border: `1px solid ${summary.accent}22`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={18} color={summary.accent} strokeWidth={1.8} />
        </div>
        <span
          style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "#f0f4ff",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {summary.landingTitle}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {[0, 1, 2].map((dot) => (
            <div
              key={dot}
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "rgba(240,244,255,0.1)",
              }}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          height: 1,
          background: `linear-gradient(to right, ${summary.accent}22, rgba(255,255,255,0.04), transparent)`,
          flexShrink: 0,
        }}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
        <Body hovered={hovered} />
      </div>

      <div
        style={{
          padding: "12px 20px 16px",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          flexShrink: 0,
          background: "rgba(255,255,255,0.01)",
        }}
      >
        <p style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 12, color: "#6e82a4", lineHeight: 1.5 }}>
          {summary.landingDescription}
        </p>
      </div>
    </motion.div>
  );
};

const ModesShowcase = () => {
  return (
    <section
      id="modes"
      style={{
        padding: "7rem clamp(1rem, 3vw, 2.5rem)",
        position: "relative",
        overflow: "hidden",
        scrollMarginTop: LANDING_SECTION_SCROLL_MARGIN,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 800,
          height: 400,
          background: "radial-gradient(ellipse, rgba(34,211,238,0.04) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 1400, margin: "0 auto", position: "relative" }}>
        <motion.p
          {...subtleReveal}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#f97316",
            marginBottom: "0.875rem",
          }}
        >
          FOUR CORE DEMO FLOWS
        </motion.p>
        <motion.h2
          {...subtleReveal}
          transition={{ ...subtleReveal.transition, delay: 0.06 }}
          style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: "clamp(2rem, 4.5vw, 4.25rem)",
            fontWeight: 700,
            letterSpacing: "-0.04em",
            color: "#f0f4ff",
            marginBottom: "0.75rem",
            lineHeight: 1.02,
            maxWidth: 780,
          }}
        >
          Show the platform in four fast moves.
        </motion.h2>
        <motion.p
          {...subtleReveal}
          transition={{ ...subtleReveal.transition, delay: 0.12 }}
          style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: "1rem",
            color: "#6e82a4",
            marginBottom: "1.25rem",
            maxWidth: 560,
            lineHeight: 1.6,
          }}
        >
          Lead with {platformModeSummaries.chat.label}, jump into {platformModeSummaries.course.label} or {platformModeSummaries.simulations.label}, then finish with {platformModeSummaries.exam.label}. These are the cleanest booth flows to explain quickly when people walk up.
        </motion.p>
        <motion.div
          {...subtleReveal}
          transition={{ ...subtleReveal.transition, delay: 0.16 }}
          style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: "3rem" }}
        >
          {landingPrimaryModeIds.map((modeId) => (
            <span
              key={modeId}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: `1px solid ${platformModeSummaries[modeId].accent}33`,
                background: `${platformModeSummaries[modeId].accent}12`,
                color: "#d9e7ff",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {platformModeSummaries[modeId].label}
            </span>
          ))}
        </motion.div>

        <div className="lp-modes-grid">
          {cardDefs.map((card, index) => (
            <ModeCard key={card.key} {...card} modeId={card.key} index={index + 1} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ModesShowcase;
