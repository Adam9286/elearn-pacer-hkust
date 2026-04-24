import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { LANDING_NAV_HEIGHT } from "@/constants/landing";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: LANDING_NAV_HEIGHT,
        padding: "0 clamp(1rem, 3vw, 2.5rem)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: scrolled ? "rgba(3,8,22,0.94)" : "rgba(0,0,0,0.72)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(34,211,238,0.1)",
        transition: "background 350ms ease, border-color 350ms ease, backdrop-filter 350ms ease",
      }}
    >
      <a href="#top" style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, textDecoration: "none" }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: "linear-gradient(135deg,#22d3ee,#0e7490)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 800,
            color: "#030816",
            fontFamily: "'JetBrains Mono', monospace",
            flexShrink: 0,
          }}
        >
          LP
        </div>
        <span
          style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: "-0.03em",
            color: "#f0f4ff",
            whiteSpace: "nowrap",
          }}
        >
          LearningPacer
        </span>
      </a>

      <Link
        to="/auth"
        style={{
          padding: "11px 18px",
          background: "rgba(34,211,238,0.12)",
          border: "1px solid rgba(34,211,238,0.22)",
          color: "#f0f4ff",
          borderRadius: 999,
          fontFamily: "'Inter Tight', sans-serif",
          fontWeight: 700,
          fontSize: 13,
          textDecoration: "none",
          whiteSpace: "nowrap",
          flexShrink: 0,
          transition: "opacity .2s ease, transform .2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "0.82";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "1";
          e.currentTarget.style.transform = "none";
        }}
      >
        Sign In
      </Link>
    </nav>
  );
};

export default Navbar;
