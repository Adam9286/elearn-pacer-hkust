import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Pause, Play, RotateCcw, Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  EXAM_TARGET_DATE_ISO,
  POMODORO_DEFAULT_MINUTES,
  POMODORO_STORAGE_KEY,
} from "@/constants/study";

interface PomodoroSnapshot {
  endsAt: number | null;
  isRunning: boolean;
  remainingSeconds: number;
}

const EXAM_TARGET_DATE = new Date(EXAM_TARGET_DATE_ISO);
const DEFAULT_POMODORO_SECONDS = POMODORO_DEFAULT_MINUTES * 60;

function getInitialPomodoroState(): PomodoroSnapshot {
  if (typeof window === "undefined") {
    return {
      endsAt: null,
      isRunning: false,
      remainingSeconds: DEFAULT_POMODORO_SECONDS,
    };
  }

  try {
    const raw = window.localStorage.getItem(POMODORO_STORAGE_KEY);
    if (!raw) {
      return {
        endsAt: null,
        isRunning: false,
        remainingSeconds: DEFAULT_POMODORO_SECONDS,
      };
    }

    const parsed = JSON.parse(raw) as Partial<PomodoroSnapshot>;
    const remainingSeconds =
      typeof parsed.remainingSeconds === "number" && parsed.remainingSeconds >= 0
        ? parsed.remainingSeconds
        : DEFAULT_POMODORO_SECONDS;
    const endsAt =
      typeof parsed.endsAt === "number" && Number.isFinite(parsed.endsAt)
        ? parsed.endsAt
        : null;
    const isRunning = Boolean(parsed.isRunning && endsAt);

    if (!isRunning || endsAt === null) {
      return {
        endsAt: null,
        isRunning: false,
        remainingSeconds,
      };
    }

    const nextRemaining = Math.max(
      0,
      Math.ceil((endsAt - Date.now()) / 1000),
    );

    return {
      endsAt: nextRemaining > 0 ? endsAt : null,
      isRunning: nextRemaining > 0,
      remainingSeconds:
        nextRemaining > 0 ? nextRemaining : DEFAULT_POMODORO_SECONDS,
    };
  } catch {
    return {
      endsAt: null,
      isRunning: false,
      remainingSeconds: DEFAULT_POMODORO_SECONDS,
    };
  }
}

function formatPomodoroTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

function formatExamDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getCountdownLabel(now: Date) {
  const diffMs = EXAM_TARGET_DATE.getTime() - now.getTime();

  if (diffMs <= 0) {
    return {
      detail: "Exam day",
      subtitle: "The target date has arrived.",
    };
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  const days = Math.floor(diffMs / dayMs);
  const hours = Math.floor((diffMs % dayMs) / hourMs);

  return {
    detail: `${days}d ${hours}h left`,
    subtitle: `Target: ${formatExamDate(EXAM_TARGET_DATE)}`,
  };
}

export default function StudyToolsStrip() {
  const [now, setNow] = useState(() => new Date());
  const [remainingSeconds, setRemainingSeconds] = useState(
    () => getInitialPomodoroState().remainingSeconds,
  );
  const [isRunning, setIsRunning] = useState(
    () => getInitialPomodoroState().isRunning,
  );
  const [endsAt, setEndsAt] = useState<number | null>(
    () => getInitialPomodoroState().endsAt,
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!isRunning || endsAt === null) {
      return;
    }

    const tick = () => {
      const nextRemaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemainingSeconds(nextRemaining);

      if (nextRemaining === 0) {
        setIsRunning(false);
        setEndsAt(null);
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [endsAt, isRunning]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const snapshot: PomodoroSnapshot = {
      endsAt,
      isRunning,
      remainingSeconds,
    };

    window.localStorage.setItem(POMODORO_STORAGE_KEY, JSON.stringify(snapshot));
  }, [endsAt, isRunning, remainingSeconds]);

  const countdown = useMemo(() => getCountdownLabel(now), [now]);

  const handlePomodoroToggle = () => {
    if (isRunning && endsAt !== null) {
      const nextRemaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemainingSeconds(nextRemaining);
      setIsRunning(false);
      setEndsAt(null);
      return;
    }

    const nextSeconds =
      remainingSeconds > 0 ? remainingSeconds : DEFAULT_POMODORO_SECONDS;
    setRemainingSeconds(nextSeconds);
    setEndsAt(Date.now() + nextSeconds * 1000);
    setIsRunning(true);
  };

  const handlePomodoroReset = () => {
    setRemainingSeconds(DEFAULT_POMODORO_SECONDS);
    setIsRunning(false);
    setEndsAt(null);
  };

  return (
    <div className="mb-4 grid gap-3 lg:grid-cols-2">
      <section className="rounded-xl border border-info/20 bg-info/[0.06] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-info/15 text-info">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-info/80">
              Exam Countdown
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">
                {countdown.detail}
              </p>
              <span className="rounded-full border border-info/20 bg-info/[0.1] px-2 py-0.5 text-[11px] text-info/90">
                ELEC3120 Final
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {countdown.subtitle}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-success/20 bg-success/[0.05] px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success">
            <Timer className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-success/80">
                  Pomodoro
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {formatPomodoroTime(remainingSeconds)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Default focus block: {POMODORO_DEFAULT_MINUTES} minutes
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handlePomodoroToggle}
                  className="gap-1.5"
                >
                  {isRunning ? (
                    <>
                      <Pause className="h-3.5 w-3.5" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      Start
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handlePomodoroReset}
                  className="gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
