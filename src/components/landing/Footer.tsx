import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(34,211,238,0.1)",
        padding: "1.75rem clamp(1rem, 3vw, 2.5rem)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem",
      }}
    >
      <a href="#top" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            background: "linear-gradient(135deg,#22d3ee,#0e7490)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            fontWeight: 800,
            color: "#030816",
          }}
        >
          LP
        </div>
        <span
          style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: "-0.03em",
            color: "rgba(240,244,255,0.45)",
          }}
        >
          LearningPacer
        </span>
      </a>

      <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
        {[
          { label: "Modes", href: "#modes" },
          { label: "Simulations", href: "#simulations" },
        ].map((item) => (
          <a
            key={item.label}
            href={item.href}
            style={{
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 12,
              color: "#6e82a4",
              textDecoration: "none",
              transition: "color .2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#f0f4ff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#6e82a4")}
          >
            {item.label}
          </a>
        ))}
        <Link
          to="/auth"
          style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 12,
            color: "#6e82a4",
            textDecoration: "none",
            transition: "color .2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#f0f4ff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#6e82a4")}
        >
          Sign In
        </Link>
      </div>

      <p
        style={{
          fontSize: 11,
          color: "rgba(138,154,184,0.35)",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        &copy; 2026 LearningPacer / HKUST ELEC3120
      </p>
    </footer>
  );
};

export default Footer;
