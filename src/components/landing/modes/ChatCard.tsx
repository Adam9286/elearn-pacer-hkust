import { ArrowRight, Link2 } from "lucide-react";
import { useEffect, useState } from "react";

type Props = { hovered: boolean };

const ChatCard = ({ hovered }: Props) => {
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setBlink((b) => !b), 530);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: 20,
        gap: 12,
        overflow: "hidden",
      }}
    >
      {/* Student bubble */}
      <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 10,
            fontWeight: 700,
            color: "rgba(240,244,255,0.5)",
          }}
        >
          Y
        </div>
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "4px 12px 12px 12px",
            padding: "9px 12px",
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 12,
            color: "rgba(240,244,255,0.75)",
            lineHeight: 1.5,
            maxWidth: "90%",
          }}
        >
          Why does TCP use sliding window for reliability?
        </div>
      </div>

      {/* AI bubble */}
      <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "rgba(34,211,238,0.15)",
            border: "1px solid rgba(34,211,238,0.25)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 8,
            fontWeight: 700,
            color: "#22d3ee",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          AI
        </div>
        <div
          style={{
            background: "rgba(34,211,238,0.05)",
            border: "1px solid rgba(34,211,238,0.12)",
            borderRadius: "4px 12px 12px 12px",
            padding: "9px 12px",
            flex: 1,
          }}
        >
          <p
            style={{
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 12,
              color: "rgba(240,244,255,0.8)",
              lineHeight: 1.6,
              marginBottom: 8,
            }}
          >
            LearningPacer AI: TCP uses a sliding window to efficiently utilize the network while ensuring reliable delivery. Multiple packets can be in-flight simultaneously without waiting for individual ACKs
            {hovered ? (
              <span style={{ opacity: blink ? 1 : 0, color: "#22d3ee" }}>▋</span>
            ) : (
              " — up to the window size."
            )}
          </p>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: "rgba(34,211,238,0.08)",
              border: "1px solid rgba(34,211,238,0.15)",
              borderRadius: 4,
              padding: "3px 8px",
            }}
          >
            <Link2 size={10} color="#22d3ee" />
            <span style={{ fontSize: 10, color: "#22d3ee", fontFamily: "'JetBrains Mono', monospace" }}>
              Cited: ELEC3120 lecture slides
            </span>
          </div>
        </div>
      </div>

      {/* Input */}
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8,
          padding: "9px 12px",
        }}
      >
        <span
          style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 12,
            color: "rgba(240,244,255,0.2)",
            flex: 1,
          }}
        >
          Ask anything…
        </span>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#22d3ee",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <ArrowRight size={10} strokeWidth={2.5} color="#030816" />
        </div>
      </div>
    </div>
  );
};

export default ChatCard;
