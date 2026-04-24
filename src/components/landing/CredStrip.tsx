const CredStrip = () => {
  return (
    <div
      id="cred-strip"
      style={{
        borderBottom: "1px solid rgba(34,211,238,0.1)",
        background: "rgba(255,255,255,0.01)",
        padding: "0.875rem clamp(1rem, 3vw, 2.5rem)",
        display: "flex",
        alignItems: "center",
        gap: "1.25rem",
      }}
    >
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="HKUST">
        <rect width="28" height="28" rx="4" fill="rgba(34,211,238,0.08)" stroke="rgba(34,211,238,0.2)" strokeWidth="1" />
        <text
          x="14"
          y="19"
          textAnchor="middle"
          fontSize="10"
          fontWeight="700"
          fontFamily="'JetBrains Mono', monospace"
          fill="#22d3ee"
        >
          HK
        </text>
      </svg>
      <div style={{ width: 1, height: 20, background: "rgba(34,211,238,0.1)" }} />
      <p
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(138,154,184,0.5)",
        }}
      >
        Built for ELEC3120 / Computer Networks / Spring 2026 demo flow
      </p>
    </div>
  );
};

export default CredStrip;
