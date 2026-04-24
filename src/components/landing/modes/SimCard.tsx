import { useEffect, useState } from "react";

type Props = { hovered: boolean };

type Arrow = { dir: "→" | "←"; label: string; color: string };

const arrows: Arrow[] = [
  { dir: "→", label: "SYN", color: "#22d3ee" },
  { dir: "←", label: "SYN-ACK", color: "#4ade80" },
  { dir: "→", label: "ACK", color: "#22d3ee" },
  { dir: "→", label: "DATA (1–4)", color: "#f97316" },
  { dir: "←", label: "ACK (5)", color: "#4ade80" },
  { dir: "→", label: "DATA (5–8)", color: "#f97316" },
];

const SimCard = ({ hovered }: Props) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!hovered) {
      setStep(0);
      return;
    }
    const id = setInterval(() => setStep((s) => (s + 1) % arrows.length), 700);
    return () => clearInterval(id);
  }, [hovered]);

  return (
    <div style={{ flex: 1, padding: 20, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Headers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 32px 1fr", gap: 4, marginBottom: 10 }}>
        <div
          style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 11,
            fontWeight: 700,
            color: "rgba(240,244,255,0.5)",
            textAlign: "center",
            padding: "4px 0",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 5,
          }}
        >
          Sender
        </div>
        <div />
        <div
          style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 11,
            fontWeight: 700,
            color: "rgba(240,244,255,0.5)",
            textAlign: "center",
            padding: "4px 0",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 5,
          }}
        >
          Receiver
        </div>
      </div>

      {/* Arrows */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        {arrows.map((a, i) => {
          const active = hovered && i === step;
          const past = !hovered || i < step;
          const labelColor = active ? a.color : "rgba(240,244,255,0.4)";
          const lineBg = active ? a.color : "rgba(255,255,255,0.12)";
          return (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                alignItems: "center",
                gap: 4,
                opacity: past || active ? 1 : 0.25,
                transition: "opacity .35s ease",
              }}
            >
              {a.dir === "→" ? (
                <>
                  <div
                    style={{
                      height: 1,
                      background: lineBg,
                      transition: "background .35s ease",
                      position: "relative",
                    }}
                  >
                    {active && (
                      <div
                        style={{
                          position: "absolute",
                          right: 0,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: a.color,
                          boxShadow: `0 0 6px ${a.color}`,
                        }}
                      />
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: labelColor,
                      fontFamily: "'JetBrains Mono', monospace",
                      whiteSpace: "nowrap",
                      textAlign: "center",
                      padding: "0 4px",
                      transition: "color .35s ease",
                    }}
                  >
                    {a.label} {a.dir}
                  </span>
                  <div />
                </>
              ) : (
                <>
                  <div />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: labelColor,
                      fontFamily: "'JetBrains Mono', monospace",
                      whiteSpace: "nowrap",
                      textAlign: "center",
                      padding: "0 4px",
                      transition: "color .35s ease",
                    }}
                  >
                    {a.dir} {a.label}
                  </span>
                  <div
                    style={{
                      height: 1,
                      background: lineBg,
                      transition: "background .35s ease",
                      position: "relative",
                    }}
                  >
                    {active && (
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: a.color,
                          boxShadow: `0 0 6px ${a.color}`,
                        }}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div
        style={{
          marginTop: 14,
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingTop: 12,
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "rgba(240,244,255,0.3)",
            fontFamily: "'JetBrains Mono', monospace",
            flex: 1,
          }}
        >
          Speed 1.0x
        </span>
        <button
          type="button"
          style={{
            padding: "4px 12px",
            background: "rgba(249,115,22,0.08)",
            border: "1px solid rgba(249,115,22,0.2)",
            borderRadius: 5,
            color: "#f97316",
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            cursor: "pointer",
          }}
        >
          {hovered ? "⏸ Pause" : "▶ Play"}
        </button>
        <button
          type="button"
          style={{
            padding: "4px 10px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 5,
            color: "rgba(240,244,255,0.3)",
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            cursor: "pointer",
          }}
        >
          ↺
        </button>
      </div>
    </div>
  );
};

export default SimCard;
