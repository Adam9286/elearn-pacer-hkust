import { useEffect, useState } from "react";

type Props = { hovered: boolean };

type Row = {
  id: string;
  label: string;
  pct: number;
  done?: boolean;
  active?: boolean;
  locked?: boolean;
};

const CourseCard = ({ hovered }: Props) => {
  const [pct, setPct] = useState(20);

  useEffect(() => {
    if (!hovered) {
      setPct(20);
      return;
    }
    let v = 20;
    const id = setInterval(() => {
      v = Math.min(62, v + 2);
      setPct(v);
      if (v >= 62) clearInterval(id);
    }, 25);
    return () => clearInterval(id);
  }, [hovered]);

  const rows: Row[] = [
    { id: "3.1a", label: "3.1 TCP Reliability", pct: 87, done: true },
    { id: "3.1b", label: "3.1 Sliding Window", pct, active: true },
    { id: "3.2", label: "3.2 Sequence Numbers", pct: 0 },
    { id: "3.3", label: "3.3 ACK Strategies", pct: 0 },
    { id: "3.4", label: "3.4 Retransmission (RTO)", pct: 0, locked: true },
    { id: "3.5", label: "3.5 Congestion Control", pct: 0 },
  ];

  return (
    <div style={{ flex: 1, padding: 20, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
          color: "#4ade80",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        Transport Layer
      </div>

      <div style={{ flex: 1 }}>
        {rows.map((r) => {
          const stateGlyph = r.done ? "✓" : r.locked ? "🔒" : r.active ? "▶" : "";
          const stateColor = r.done
            ? "#22d3ee"
            : r.active
              ? "#4ade80"
              : r.locked
                ? "rgba(240,244,255,0.18)"
                : "rgba(240,244,255,0.25)";
          const labelColor = r.pct > 0 && !r.locked ? "rgba(240,244,255,0.85)" : "rgba(240,244,255,0.3)";
          return (
            <div
              key={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 0",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: stateColor,
                  flexShrink: 0,
                  width: 28,
                }}
              >
                {stateGlyph}
              </span>
              <span
                style={{
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 12,
                  color: labelColor,
                  flex: 1,
                  fontWeight: r.active ? 600 : 400,
                }}
              >
                {r.label}
              </span>
              {r.pct > 0 && !r.locked && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                  <div style={{ width: 44, height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2 }}>
                    <div
                      style={{
                        width: `${r.active ? pct : r.pct}%`,
                        height: "100%",
                        background: r.done ? "#22d3ee" : "#4ade80",
                        borderRadius: 2,
                        transition: "width .25s ease-out",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: r.done ? "#22d3ee" : "#4ade80",
                      width: 26,
                      textAlign: "right",
                    }}
                  >
                    {r.active ? pct : r.pct}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: "rgba(240,244,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>
            Course progress
          </span>
          <span style={{ fontSize: 11, color: "#f97316", fontFamily: "'JetBrains Mono', monospace" }}>62%</span>
        </div>
        <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
          <div
            style={{
              width: "62%",
              height: "100%",
              background: "linear-gradient(to right,#22d3ee,#f97316)",
              borderRadius: 2,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
