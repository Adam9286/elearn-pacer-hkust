import { createContext, useContext, useEffect, useState } from "react";

// All available themes
export type Theme =
  | "midnight" | "slate" | "mocha" | "carbon"  // Dark themes
  | "sage" | "cream" | "lavender" | "ocean";    // Light themes

export const darkThemes: Theme[] = ["midnight", "slate", "mocha", "carbon"];
export const lightThemes: Theme[] = ["sage", "cream", "lavender", "ocean"];

export const themeConfig: Record<Theme, { name: string; bg: string; accent: string; isDark: boolean }> = {
  // Light themes (soft, comfortable - distinct tints for eye comfort)
  sage: { name: "Sage", bg: "#c5d9c5", accent: "#3d7a52", isDark: false },
  cream: { name: "Cream", bg: "#f0e4c8", accent: "#a67c3d", isDark: false },
  lavender: { name: "Lavender", bg: "#ddd6e8", accent: "#7a5a9e", isDark: false },
  ocean: { name: "Ocean", bg: "#cddbe8", accent: "#3d7a9e", isDark: false },
  
  // Dark themes (desaturated for eye comfort)
  midnight: { name: "Midnight", bg: "#141a24", accent: "#00ffff", isDark: true },
  slate: { name: "Slate", bg: "#1e2530", accent: "#5a9ec9", isDark: true },
  mocha: { name: "Mocha", bg: "#1a1614", accent: "#c9a05a", isDark: true },
  carbon: { name: "Carbon", bg: "#171717", accent: "#d97a3d", isDark: true },
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
    // Migrate renamed themes
    if (stored === "forest") return "slate" as Theme;
    if (stored === "dusk") return "mocha" as Theme;
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
