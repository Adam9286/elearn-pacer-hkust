import { Check } from "lucide-react";
import { useEffect, useState } from "react";

type Props = { hovered: boolean };

type Option = { letter: string; text: string; correct?: boolean };

const opts: Option[] = [
  { letter: "A", text: "Ensure reliable delivery of packets in order" },
  { letter: "B", text: "Control the sender's rate based on network congestion", correct: true },
  { letter: "C", text: "Handle out-of-order packet reassembly" },
  { letter: "D", text: "Manage source and destination port numbers" },
];

const ExamCard = ({ hovered }: Props) => {
  const [sel, setSel] = useState(1);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!hovered) {
      setPulse(false);
      return;
    }
    const id = setInterval(() => setPulse((p) => !p), 900);
    return () => {
      clearInterval(id);
      setPulse(false);
    };
  }, [hovered]);

  const circumference = 2 * Math.PI * 20;
  const correctSel = sel === 1;

  return (
    <div style={{ flex: 1, padding: 20, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
          color: "#a78bfa",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        Q12 of 20
      </div>
      <p
        style={{
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 12,
          color: "rgba(240,244,255,0.85)",
          lineHeight: 1.55,
          marginBottom: 12,
          fontWeight: 500,
        }}
      >
        In TCP, which of the following best describes the purpose of the congestion window (cwnd)?
      </p>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
        {opts.map((o, i) => {
          const isSelected = sel === i;
          const isCorrect = !!o.correct;
          const highlight = isSelected && isCorrect && hovered && pulse;
          const borderColor = isSelected
            ? isCorrect
              ? `rgba(34,211,238,${highlight ? 0.4 : 0.25})`
              : "rgba(249,115,22,0.25)"
            : "rgba(255,255,255,0.06)";
          const bg = isSelected
            ? isCorrect
              ? `rgba(34,211,238,${highlight ? 0.1 : 0.05})`
              : "rgba(249,115,22,0.05)"
            : "transparent";
          const dotBg = isSelected ? (isCorrect ? "#22d3ee" : "#f97316") : "transparent";
          const ringBorder = isSelected ? (isCorrect ? "#22d3ee" : "#f97316") : "rgba(255,255,255,0.18)";
          const letterColor = isSelected
            ? isCorrect
              ? "#22d3ee"
              : "#f97316"
            : "rgba(240,244,255,0.3)";
          const textColor = isSelected ? "rgba(240,244,255,0.9)" : "rgba(240,244,255,0.45)";

          return (
            <div
              key={o.letter}
              role="button"
              tabIndex={0}
              onClick={() => setSel(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setSel(i);
              }}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "7px 10px",
                borderRadius: 6,
                cursor: "pointer",
                border: `1px solid ${borderColor}`,
                background: bg,
                transition: "all .24s ease-out",
                boxShadow: highlight ? "0 0 12px rgba(34,211,238,0.15)" : "none",
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  border: `1.5px solid ${ringBorder}`,
                  flexShrink: 0,
                  marginTop: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "border-color .24s ease",
                }}
              >
                {isSelected && (
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: dotBg,
                      transition: "background .24s ease",
                    }}
                  />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: letterColor,
                    marginRight: 5,
                  }}
                >
                  {o.letter}.
                </span>
                <span
                  style={{
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 12,
                    color: textColor,
                    lineHeight: 1.4,
                  }}
                >
                  {o.text}
                </span>
              </div>
              {isSelected && isCorrect && <Check size={12} color="#22d3ee" strokeWidth={2.5} />}
            </div>
          );
        })}
      </div>

      {/* Score ring */}
      <div
        style={{
          marginTop: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 10,
          paddingTop: 10,
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: correctSel ? "#22d3ee" : "#f97316",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {correctSel ? "✓ Correct" : "✗ Try again"}
        </span>
        <div style={{ position: "relative", width: 44, height: 44 }}>
          <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="22" cy="22" r="20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
            <circle
              cx="22"
              cy="22"
              r="20"
              fill="none"
              stroke={correctSel ? "#22d3ee" : "rgba(249,115,22,0.5)"}
              strokeWidth="2.5"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - (correctSel ? 0.92 : 0.3))}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset .4s ease-out, stroke .3s ease" }}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 800,
              color: correctSel ? "#22d3ee" : "#f97316",
              fontFamily: "'Inter Tight', sans-serif",
            }}
          >
            {correctSel ? "92%" : "30%"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamCard;
