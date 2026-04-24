import { type ReactNode, useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { Link } from "react-router-dom";

import { HERO_MOTION_STORAGE_KEY, LANDING_NAV_HEIGHT } from "@/constants/landing";
import { platformModeSummaries } from "@/data/platformContent";

const HEADLINE_WHITE = ["Every", "click", "travels", "12,000", "miles", "and", "you", "are", "about", "to"];
const HEADLINE_CYAN = ["understand", "all", "of", "it."];
const PAUSED_HERO_WALLPAPER = "/hero-paused-wallpaper.png";
const HERO_AUDIO_VOLUME = 0.42;

type HeroToggleProps = {
  active: boolean;
  label: string;
  ariaLabel: string;
  icon: ReactNode;
  onClick: () => void;
};

const HeroToggle = ({ active, label, ariaLabel, icon, onClick }: HeroToggleProps) => {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      onClick={onClick}
      style={{
        padding: "9px 12px",
        background: active ? "rgba(34,211,238,0.13)" : "rgba(255,255,255,0.02)",
        color: active ? "#f0fcff" : "#d9e7ff",
        border: `1px solid ${active ? "rgba(34,211,238,0.32)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 999,
        fontFamily: "'Inter Tight', sans-serif",
        fontWeight: 700,
        fontSize: 13,
        cursor: "pointer",
        letterSpacing: "-0.01em",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        whiteSpace: "nowrap",
        transition: "border-color .2s ease, background .2s ease, color .2s ease",
      }}
    >
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: active ? "rgba(34,211,238,0.16)" : "rgba(255,255,255,0.04)",
          color: active ? "#22d3ee" : "rgba(240,244,255,0.72)",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      {label}
    </button>
  );
};

const Hero = () => {
  const [wordsIn, setWordsIn] = useState(false);
  const [chevronVisible, setChevronVisible] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const storedPreference = window.localStorage.getItem(HERO_MOTION_STORAGE_KEY);
    if (storedPreference !== null) return storedPreference === "true";
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const fallback = setTimeout(() => setWordsIn(true), 800);
    const video = videoRef.current;
    if (!video) return () => clearTimeout(fallback);

    const onCanPlay = () => {
      clearTimeout(fallback);
      setTimeout(() => setWordsIn(true), 300);
    };

    video.addEventListener("canplay", onCanPlay, { once: true });
    return () => {
      clearTimeout(fallback);
      video.removeEventListener("canplay", onCanPlay);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(HERO_MOTION_STORAGE_KEY, String(motionEnabled));
  }, [motionEnabled]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const shouldPlayAudio = audioEnabled && audioUnlocked;
    video.muted = !shouldPlayAudio;
    video.volume = shouldPlayAudio ? HERO_AUDIO_VOLUME : 0;

    if (!motionEnabled) {
      video.pause();
      return;
    }

    const resumeVideo = async () => {
      try {
        await video.play();
      } catch {
        video.muted = true;
        video.volume = 0;
        try {
          await video.play();
        } catch {
          video.pause();
        }
      }
    };

    void resumeVideo();
  }, [audioEnabled, audioUnlocked, motionEnabled]);

  useEffect(() => {
    if (!audioEnabled || audioUnlocked) return;

    const unlockAudio = async () => {
      const video = videoRef.current;
      if (!video) return;

      setAudioUnlocked(true);
      video.muted = false;
      video.volume = HERO_AUDIO_VOLUME;

      try {
        await video.play();
      } catch {
        video.muted = true;
        video.volume = 0;
        setAudioUnlocked(false);
      }
    };

    const handleFirstInteraction = () => {
      void unlockAudio();
    };

    window.addEventListener("pointerdown", handleFirstInteraction, { once: true, passive: true });
    window.addEventListener("keydown", handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, [audioEnabled, audioUnlocked]);

  useEffect(() => {
    const onScroll = () => setChevronVisible(window.scrollY < 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const allWords = [...HEADLINE_WHITE, ...HEADLINE_CYAN];
  const cyanStart = HEADLINE_WHITE.length;
  const scrollToModes = () => {
    document.getElementById("modes")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const unlockAudio = async () => {
    const video = videoRef.current;
    if (!video) return false;

    setAudioUnlocked(true);
    video.muted = false;
    video.volume = HERO_AUDIO_VOLUME;

    try {
      await video.play();
      return true;
    } catch {
      video.muted = true;
      video.volume = 0;
      setAudioUnlocked(false);
      return false;
    }
  };

  const toggleAudio = async () => {
    if (audioEnabled && !audioUnlocked) {
      await unlockAudio();
      return;
    }

    const nextAudioEnabled = !audioEnabled;
    setAudioEnabled(nextAudioEnabled);

    const video = videoRef.current;
    if (!video) return;

    if (!nextAudioEnabled) {
      video.muted = true;
      video.volume = 0;
      return;
    }

    video.muted = false;
    video.volume = HERO_AUDIO_VOLUME;

    try {
      await video.play();
    } catch {
      video.pause();
    }
  };

  return (
    <section
      id="top"
      className="lp-grain"
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        minHeight: 560,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          backgroundColor: "#030816",
          backgroundImage: `url(${PAUSED_HERO_WALLPAPER})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <video
        ref={videoRef}
        src="/hero.mp4"
        poster="/hero-poster.jpg"
        autoPlay={motionEnabled}
        loop
        muted
        playsInline
        preload="auto"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
          opacity: motionEnabled ? 1 : 0,
          transition: "opacity .35s ease",
        }}
      />

      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: LANDING_NAV_HEIGHT + 10, background: "#000", zIndex: 2 }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 46, background: "#000", zIndex: 2 }} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background:
            "radial-gradient(ellipse 110% 100% at 60% 50%, transparent 30%, rgba(3,8,22,0.75) 80%, rgba(3,8,22,0.95) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background:
            "linear-gradient(to right, rgba(3,8,22,0.92) 0%, rgba(3,8,22,0.6) 45%, rgba(3,8,22,0.05) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 180,
          zIndex: 3,
          background: "linear-gradient(to bottom, transparent, #030816)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 4,
          padding: "0 clamp(1rem, 3vw, 2.5rem)",
          maxWidth: 780,
          paddingTop: `clamp(${LANDING_NAV_HEIGHT + 28}px, 14vh, ${LANDING_NAV_HEIGHT + 96}px)`,
        }}
      >
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#f97316",
            marginBottom: "1rem",
            opacity: wordsIn ? 1 : 0,
            transform: wordsIn ? "none" : "translateY(8px)",
            transition: "opacity .5s ease-out, transform .5s ease-out",
          }}
        >
          ELEC3120 / COMPUTER NETWORKS / HKUST
        </p>

        <h1
          style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: "clamp(1.9rem, 3.2vw, 3.25rem)",
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: "-0.04em",
            marginBottom: "0.875rem",
            maxWidth: 680,
          }}
        >
          {allWords.map((word, index) => {
            const isCyan = index >= cyanStart;
            return (
              <span
                key={`${word}-${index}`}
                style={{
                  display: "inline",
                  color: isCyan ? "#22d3ee" : "#f0f4ff",
                  opacity: wordsIn ? 1 : 0,
                  transform: wordsIn ? "none" : "translateY(10px)",
                  transition: "opacity .4s ease-out, transform .4s ease-out",
                  transitionDelay: wordsIn ? `${index * 60}ms` : "0ms",
                }}
              >
                {word}{" "}
              </span>
            );
          })}
        </h1>

        <p
          style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: "clamp(.9rem, 1.2vw, 1.05rem)",
            fontWeight: 400,
            lineHeight: 1.6,
            color: "#6e82a4",
            marginBottom: "1.75rem",
            maxWidth: 560,
            opacity: wordsIn ? 1 : 0,
            transform: wordsIn ? "none" : "translateY(8px)",
            transition: "opacity .5s .7s ease-out, transform .5s .7s ease-out",
          }}
        >
          {platformModeSummaries.chat.label}, {platformModeSummaries.course.label}, {platformModeSummaries.simulations.label}, and {platformModeSummaries.exam.label} are the fastest booth demo flows. {platformModeSummaries.compare.label} mode is there too when you want a side-by-side grounded answer check.
        </p>

        <div
          style={{
            display: "flex",
            gap: "0.875rem",
            flexWrap: "wrap",
            alignItems: "center",
            opacity: wordsIn ? 1 : 0,
            transform: wordsIn ? "none" : "translateY(8px)",
            transition: "opacity .5s .85s ease-out, transform .5s .85s ease-out",
          }}
        >
          <Link
            to="/auth"
            className="animate-lp-cyan-pulse"
            style={{
              padding: "13px 28px",
              background: "#22d3ee",
              color: "#030816",
              borderRadius: 8,
              fontFamily: "'Inter Tight', sans-serif",
              fontWeight: 800,
              fontSize: 15,
              textDecoration: "none",
              letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
              transition: "opacity .2s ease, transform .2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.87";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "none";
            }}
          >
            Start Learning
          </Link>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: 6,
              borderRadius: 999,
              background: "rgba(3,8,22,0.44)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 20px 60px -36px rgba(3,8,22,0.95)",
              backdropFilter: "blur(16px)",
              flexWrap: "wrap",
            }}
          >
            <HeroToggle
              active={motionEnabled}
              label={motionEnabled ? "Motion on" : "Motion off"}
              ariaLabel={motionEnabled ? "Pause hero motion" : "Resume hero motion"}
              icon={motionEnabled ? <Pause size={13} strokeWidth={2.3} /> : <Play size={13} strokeWidth={2.3} />}
              onClick={() => setMotionEnabled((current) => !current)}
            />
            <HeroToggle
              active={audioEnabled}
              label={audioEnabled ? (audioUnlocked ? "Audio on" : "Enable sound") : "Audio off"}
              ariaLabel={audioEnabled ? (audioUnlocked ? "Mute hero audio" : "Enable hero audio") : "Unmute hero audio"}
              icon={audioEnabled ? <Volume2 size={13} strokeWidth={2.3} /> : <VolumeX size={13} strokeWidth={2.3} />}
              onClick={() => {
                void toggleAudio();
              }}
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={scrollToModes}
        aria-label="Scroll to the platform overview"
        className="animate-lp-bob"
        style={{
          position: "absolute",
          bottom: "5vh",
          left: "50%",
          zIndex: 4,
          color: "rgba(240,244,255,0.28)",
          opacity: chevronVisible ? 1 : 0,
          transition: "opacity .4s ease",
          pointerEvents: chevronVisible ? "auto" : "none",
          background: "transparent",
          border: 0,
          padding: 0,
          cursor: "pointer",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </section>
  );
};

export default Hero;
