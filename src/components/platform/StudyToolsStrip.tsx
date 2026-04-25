import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BellRing,
  CalendarDays,
  Pause,
  Play,
  RotateCcw,
  Timer,
  Volume2,
  VolumeX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  EXAM_TARGET_DATE_ISO,
  POMODORO_DEFAULT_MINUTES,
  POMODORO_STORAGE_KEY,
} from "@/constants/study";

interface PomodoroSnapshot {
  durationSeconds: number;
  durationMinutes?: number;
  endsAt: number | null;
  notificationPermission: "default" | "denied" | "granted";
  isRunning: boolean;
  remainingSeconds: number;
  soundEnabled: boolean;
  customMinutes?: string;
  desktopNotificationsEnabled: boolean;
}

const EXAM_TARGET_DATE = new Date(EXAM_TARGET_DATE_ISO);
const DEFAULT_NOTIFICATION_PERMISSION = "default";
const DEFAULT_POMODORO_SECONDS = POMODORO_DEFAULT_MINUTES * 60;
const DEFAULT_SOUND_ENABLED = true;
const DEFAULT_DESKTOP_NOTIFICATIONS_ENABLED = true;
const MIN_POMODORO_SECONDS = 1;
const MAX_POMODORO_SECONDS = 24 * 60 * 60;

function getInitialPomodoroState(): PomodoroSnapshot {
  const baseState: PomodoroSnapshot = {
    durationSeconds: DEFAULT_POMODORO_SECONDS,
    endsAt: null,
    notificationPermission:
      typeof window !== "undefined" && "Notification" in window
        ? Notification.permission
        : DEFAULT_NOTIFICATION_PERMISSION,
    isRunning: false,
    remainingSeconds: DEFAULT_POMODORO_SECONDS,
    soundEnabled: DEFAULT_SOUND_ENABLED,
    desktopNotificationsEnabled: DEFAULT_DESKTOP_NOTIFICATIONS_ENABLED,
  };

  if (typeof window === "undefined") {
    return baseState;
  }

  try {
    const raw = window.localStorage.getItem(POMODORO_STORAGE_KEY);
    if (!raw) {
      return baseState;
    }

    const parsed = JSON.parse(raw) as Partial<PomodoroSnapshot>;
    const durationSeconds =
      typeof parsed.durationSeconds === "number" &&
      Number.isFinite(parsed.durationSeconds)
        ? clampPomodoroSeconds(parsed.durationSeconds)
        : typeof parsed.durationMinutes === "number" &&
            Number.isFinite(parsed.durationMinutes)
          ? clampPomodoroSeconds(parsed.durationMinutes * 60)
          : DEFAULT_POMODORO_SECONDS;
    const remainingSeconds =
      typeof parsed.remainingSeconds === "number" && parsed.remainingSeconds >= 0
        ? parsed.remainingSeconds
        : durationSeconds;
    const endsAt =
      typeof parsed.endsAt === "number" && Number.isFinite(parsed.endsAt)
        ? parsed.endsAt
        : null;
    const isRunning = Boolean(parsed.isRunning && endsAt);
    const soundEnabled =
      typeof parsed.soundEnabled === "boolean"
        ? parsed.soundEnabled
        : DEFAULT_SOUND_ENABLED;
    const desktopNotificationsEnabled =
      typeof parsed.desktopNotificationsEnabled === "boolean"
        ? parsed.desktopNotificationsEnabled
        : DEFAULT_DESKTOP_NOTIFICATIONS_ENABLED;
    const notificationPermission =
      typeof parsed.notificationPermission === "string" &&
      ["default", "denied", "granted"].includes(parsed.notificationPermission)
        ? parsed.notificationPermission
        : ("Notification" in window
            ? Notification.permission
            : DEFAULT_NOTIFICATION_PERMISSION);

    if (!isRunning || endsAt === null) {
      return {
        durationSeconds,
        endsAt: null,
        notificationPermission,
        isRunning: false,
        remainingSeconds,
        soundEnabled,
        desktopNotificationsEnabled,
      };
    }

    const nextRemaining = Math.max(
      0,
      Math.ceil((endsAt - Date.now()) / 1000),
    );

    return {
      durationSeconds,
      endsAt: nextRemaining > 0 ? endsAt : null,
      notificationPermission,
      isRunning: nextRemaining > 0,
      remainingSeconds:
        nextRemaining > 0 ? nextRemaining : durationSeconds,
      soundEnabled,
      desktopNotificationsEnabled,
    };
  } catch {
    return baseState;
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

function clampPomodoroSeconds(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_POMODORO_SECONDS;
  }

  const wholeSeconds = Math.floor(value);
  return Math.min(
    MAX_POMODORO_SECONDS,
    Math.max(MIN_POMODORO_SECONDS, wholeSeconds),
  );
}

function parsePomodoroTimeInput(rawValue: string) {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    return null;
  }

  if (/^\d+$/.test(trimmed)) {
    // Plain numbers are interpreted as seconds (e.g. "10" => 10 seconds).
    return clampPomodoroSeconds(Number.parseInt(trimmed, 10));
  }

  const match = /^(\d+):(\d{1,2})$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const minutes = Number.parseInt(match[1], 10);
  const seconds = Number.parseInt(match[2], 10);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds > 59) {
    return null;
  }

  return clampPomodoroSeconds(minutes * 60 + seconds);
}

export default function StudyToolsStrip() {
  const initialPomodoroState = useMemo(() => getInitialPomodoroState(), []);
  const { toast } = useToast();
  const [now, setNow] = useState(() => new Date());
  const [durationSeconds, setDurationSeconds] = useState(
    initialPomodoroState.durationSeconds,
  );
  const [remainingSeconds, setRemainingSeconds] = useState(
    initialPomodoroState.remainingSeconds,
  );
  const [isRunning, setIsRunning] = useState(initialPomodoroState.isRunning);
  const [endsAt, setEndsAt] = useState<number | null>(initialPomodoroState.endsAt);
  const [soundEnabled, setSoundEnabled] = useState(
    initialPomodoroState.soundEnabled,
  );
  const [desktopNotificationsEnabled, setDesktopNotificationsEnabled] = useState(
    initialPomodoroState.desktopNotificationsEnabled,
  );
  const [notificationPermission, setNotificationPermission] = useState<
    "default" | "denied" | "granted"
  >(initialPomodoroState.notificationPermission);
  const [timeInputValue, setTimeInputValue] = useState(
    formatPomodoroTime(initialPomodoroState.remainingSeconds),
  );
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [finishPulse, setFinishPulse] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const hasNotifiedCompletionRef = useRef(false);

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

    hasNotifiedCompletionRef.current = false;

    const tick = () => {
      const nextRemaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemainingSeconds(nextRemaining);

      if (nextRemaining === 0 && !hasNotifiedCompletionRef.current) {
        hasNotifiedCompletionRef.current = true;
        setIsRunning(false);
        setEndsAt(null);
        setFinishPulse(true);
        toast({
          title: "Pomodoro finished",
          description:
            "Your focus block is done. Stretch, review, or start another session.",
        });

        if (
          desktopNotificationsEnabled &&
          notificationPermission === "granted" &&
          "Notification" in window
        ) {
          const notification = new Notification("LearningPacer Pomodoro finished", {
            body: "Your focus block has ended.",
            silent: true,
          });

          window.setTimeout(() => notification.close(), 6000);
        }

        if (soundEnabled) {
          try {
            const AudioContextCtor =
              window.AudioContext ||
              (window as typeof window & {
                webkitAudioContext?: typeof AudioContext;
              }).webkitAudioContext;

            if (AudioContextCtor) {
              const context =
                audioContextRef.current ?? new AudioContextCtor();
              audioContextRef.current = context;

              if (context.state === "suspended") {
                void context.resume();
              }

              const now = context.currentTime;
              const master = context.createGain();
              master.gain.setValueAtTime(0.0001, now);
              master.gain.exponentialRampToValueAtTime(0.028, now + 0.04);
              master.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
              master.connect(context.destination);

              const notes = [
                { frequency: 523.25, start: 0 },
                { frequency: 659.25, start: 0.22 },
                { frequency: 783.99, start: 0.48 },
              ];

              notes.forEach(({ frequency, start }) => {
                const oscillator = context.createOscillator();
                const gain = context.createGain();
                oscillator.type = "sine";
                oscillator.frequency.setValueAtTime(frequency, now + start);
                gain.gain.setValueAtTime(0.0001, now + start);
                gain.gain.exponentialRampToValueAtTime(0.18, now + start + 0.06);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + start + 0.52);
                oscillator.connect(gain);
                gain.connect(master);
                oscillator.start(now + start);
                oscillator.stop(now + start + 0.6);
              });
            }
          } catch {
            // Ignore audio failures; the toast still covers completion.
          }
        }
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [
    desktopNotificationsEnabled,
    endsAt,
    isRunning,
    notificationPermission,
    soundEnabled,
    toast,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const snapshot: PomodoroSnapshot = {
      durationSeconds,
      durationMinutes: Math.ceil(durationSeconds / 60),
      endsAt,
      notificationPermission,
      isRunning,
      remainingSeconds,
      soundEnabled,
      customMinutes: String(Math.ceil(durationSeconds / 60)),
      desktopNotificationsEnabled,
    };

    window.localStorage.setItem(POMODORO_STORAGE_KEY, JSON.stringify(snapshot));
  }, [
    desktopNotificationsEnabled,
    durationSeconds,
    endsAt,
    isRunning,
    notificationPermission,
    remainingSeconds,
    soundEnabled,
  ]);

  useEffect(() => {
    if (!finishPulse) return;
    const timeoutId = window.setTimeout(() => setFinishPulse(false), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [finishPulse]);

  useEffect(() => {
    if (isEditingTime) return;
    setTimeInputValue(formatPomodoroTime(remainingSeconds));
  }, [isEditingTime, remainingSeconds]);

  const countdown = useMemo(() => getCountdownLabel(now), [now]);

  const updatePomodoroDuration = (nextDurationSeconds: number) => {
    const clampedDurationSeconds = clampPomodoroSeconds(nextDurationSeconds);
    setDurationSeconds(clampedDurationSeconds);
    setRemainingSeconds(clampedDurationSeconds);
    setIsRunning(false);
    setEndsAt(null);
    setFinishPulse(false);
    hasNotifiedCompletionRef.current = false;
    setTimeInputValue(formatPomodoroTime(clampedDurationSeconds));
  };

  const unlockAudioContext = async () => {
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;

    if (!AudioContextCtor) return;
    const context = audioContextRef.current ?? new AudioContextCtor();
    audioContextRef.current = context;
    if (context.state === "suspended") {
      await context.resume();
    }
  };

  const handlePomodoroToggle = () => {
    if (isRunning && endsAt !== null) {
      const nextRemaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemainingSeconds(nextRemaining);
      setIsRunning(false);
      setEndsAt(null);
      return;
    }

    const parsedTimeInput = parsePomodoroTimeInput(timeInputValue);
    const hasEditedTime =
      timeInputValue.trim() !== formatPomodoroTime(remainingSeconds);
    const nextDurationValue =
      parsedTimeInput !== null ? parsedTimeInput : durationSeconds;

    if (hasEditedTime && parsedTimeInput !== null) {
      setDurationSeconds(nextDurationValue);
      setRemainingSeconds(nextDurationValue);
    }

    const nextSeconds =
      hasEditedTime && parsedTimeInput !== null
        ? nextDurationValue
        : remainingSeconds > 0 && remainingSeconds !== durationSeconds
        ? remainingSeconds
        : nextDurationValue;
    setRemainingSeconds(nextSeconds);
    setEndsAt(Date.now() + nextSeconds * 1000);
    setIsRunning(true);
    setFinishPulse(false);
    hasNotifiedCompletionRef.current = false;
    if (soundEnabled) {
      void unlockAudioContext();
    }
  };

  const handlePomodoroReset = () => {
    setRemainingSeconds(durationSeconds);
    setIsRunning(false);
    setEndsAt(null);
    setFinishPulse(false);
    hasNotifiedCompletionRef.current = false;
  };

  const handleTimeInputApply = () => {
    const parsedTimeInput = parsePomodoroTimeInput(timeInputValue);
    setIsEditingTime(false);

    if (parsedTimeInput === null) {
      setTimeInputValue(formatPomodoroTime(remainingSeconds));
      toast({
        title: "Invalid time",
        description: "Enter seconds (e.g. 10) or mm:ss (e.g. 25:00).",
      });
      return;
    }

    updatePomodoroDuration(parsedTimeInput);
  };

  const handleDesktopNotificationsToggle = async () => {
    if (!("Notification" in window)) {
      toast({
        title: "Browser notifications unavailable",
        description: "This browser does not support desktop notifications here.",
      });
      return;
    }

    if (desktopNotificationsEnabled) {
      setDesktopNotificationsEnabled(false);
      return;
    }

    if (Notification.permission === "granted") {
      setNotificationPermission("granted");
      setDesktopNotificationsEnabled(true);
      return;
    }

    if (Notification.permission === "denied") {
      setNotificationPermission("denied");
      toast({
        title: "Desktop notifications blocked",
        description: "Allow browser notifications in site settings if you want pop-up alerts.",
      });
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission === "granted") {
      setDesktopNotificationsEnabled(true);
      toast({
        title: "Desktop notifications enabled",
        description: "LearningPacer will show a gentle browser alert when the timer ends.",
      });
      return;
    }

    setDesktopNotificationsEnabled(false);
    toast({
      title: "Desktop notifications not enabled",
      description: "The in-app toast will still appear when the timer finishes.",
    });
  };

  const handleSoundToggle = async () => {
    if (!soundEnabled) {
      await unlockAudioContext();
    }
    setSoundEnabled((current) => !current);
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

      <section
        className={`rounded-xl border px-4 py-3 transition-colors ${
          finishPulse
            ? "border-success/45 bg-success/[0.12]"
            : "border-success/20 bg-success/[0.05]"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success">
            <Timer className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-success/80">
                  Pomodoro
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={timeInputValue}
                    onChange={(event) => setTimeInputValue(event.target.value)}
                    onFocus={() => setIsEditingTime(true)}
                    onBlur={handleTimeInputApply}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleTimeInputApply();
                        event.currentTarget.blur();
                      }
                    }}
                    aria-label="Pomodoro time"
                    className="h-11 w-[108px] rounded-lg border border-success/20 bg-background/80 px-3 text-center text-lg font-semibold tracking-[0.08em] text-foreground shadow-sm outline-none transition-colors focus:border-success/40 focus:ring-2 focus:ring-success/20"
                  />

                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => void handleSoundToggle()}
                          aria-label={
                            soundEnabled
                              ? "Disable timer sound"
                              : "Enable timer sound"
                          }
                          className={`h-9 w-9 rounded-full border ${
                            soundEnabled
                              ? "border-success/25 bg-success/10 text-success hover:bg-success/15"
                              : "border-border/70 bg-background/70 text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {soundEnabled ? (
                            <Volume2 className="h-4 w-4" />
                          ) : (
                            <VolumeX className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {soundEnabled
                          ? "Click to disable sound"
                          : "Click to enable sound"}
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => void handleDesktopNotificationsToggle()}
                          aria-label={
                            desktopNotificationsEnabled
                              ? "Disable browser alert"
                              : "Enable browser alert"
                          }
                          className={`h-9 w-9 rounded-full border ${
                            desktopNotificationsEnabled
                              ? "border-success/25 bg-success/10 text-success hover:bg-success/15"
                              : "border-border/70 bg-background/70 text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {desktopNotificationsEnabled ? (
                            <BellRing className="h-4 w-4" />
                          ) : (
                            <Bell className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {desktopNotificationsEnabled
                          ? "Click to disable browser alert"
                          : "Click to enable browser alert"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
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

            <div className="h-1" aria-hidden="true" />
          </div>
        </div>
      </section>
    </div>
  );
}
