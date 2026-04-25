const STORAGE_KEY = "lp.lastMode";

export const PLATFORM_TAB_IDS = [
  "chat",
  "compare",
  "course",
  "exam",
  "simulations",
  "feedback",
] as const;

export type PlatformTabId = (typeof PLATFORM_TAB_IDS)[number];

export const isPlatformTabId = (value: string | null | undefined): value is PlatformTabId => {
  return value !== null && value !== undefined && (PLATFORM_TAB_IDS as readonly string[]).includes(value);
};

export const readLastMode = (): PlatformTabId | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return isPlatformTabId(raw) ? raw : null;
  } catch {
    return null;
  }
};

export const writeLastMode = (mode: PlatformTabId): void => {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Persistence is a UX enhancement, not a correctness requirement.
  }
};

