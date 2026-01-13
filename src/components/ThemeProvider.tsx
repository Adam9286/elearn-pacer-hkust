import { createContext, useContext, useEffect, useState } from "react";

// All available themes
export type Theme =
  | "midnight" | "forest" | "dusk" | "carbon"  // Dark themes
  | "sage" | "cream" | "lavender" | "ocean";    // Light themes

export const darkThemes: Theme[] = ["midnight", "forest", "dusk", "carbon"];
export const lightThemes: Theme[] = ["sage", "cream", "lavender", "ocean"];

export const themeConfig: Record<Theme, { name: string; bg: string; accent: string; isDark: boolean }> = {
  // Light themes (soft, comfortable)
  sage: { name: "Sage", bg: "#e8ede8", accent: "#4a9080", isDark: false },
  cream: { name: "Cream", bg: "#f5f0e6", accent: "#c9a050", isDark: false },
  lavender: { name: "Lavender", bg: "#ebe8f0", accent: "#8b6fad", isDark: false },
  ocean: { name: "Ocean", bg: "#e6eef2", accent: "#4a90a5", isDark: false },
  
  // Dark themes (rich, comfortable)
  midnight: { name: "Midnight", bg: "#141a24", accent: "#00ffff", isDark: true },
  forest: { name: "Forest", bg: "#0f1a14", accent: "#34d399", isDark: true },
  dusk: { name: "Dusk", bg: "#1a1420", accent: "#f472b6", isDark: true },
  carbon: { name: "Carbon", bg: "#141414", accent: "#f97316", isDark: true },
};

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDarkTheme: boolean;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = "midnight",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("platform-theme");
    // Migrate old theme values
    if (stored === "dark") return "midnight" as Theme;
    if (stored === "light") return "sage" as Theme;
    // Check if stored value is a valid theme
    if (stored && stored in themeConfig) return stored as Theme;
    return defaultTheme;
  });

  const isDarkTheme = themeConfig[theme]?.isDark ?? true;

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove all theme classes
    const allThemes = [...darkThemes, ...lightThemes, "dark", "light"];
    root.classList.remove(...allThemes);
    
    // Add the current theme class
    root.classList.add(theme);
    
    // Also add dark/light class for compatibility with existing styles
    if (isDarkTheme) {
      root.classList.add("dark");
    } else {
      root.classList.add("light");
    }
    
    localStorage.setItem("platform-theme", theme);
  }, [theme, isDarkTheme]);

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme, isDarkTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
