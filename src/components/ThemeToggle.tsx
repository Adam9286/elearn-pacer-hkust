import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div 
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="relative flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-electric-cyan/20 to-neon-purple/20 border-2 border-electric-cyan/30 hover:border-electric-cyan/60 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)] transition-all duration-300 cursor-pointer"
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      <span className="text-sm font-semibold dark:text-white light:text-foreground hidden sm:inline tracking-wide">Theme</span>
      <div className="relative w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 hover:scale-110 hover:bg-electric-cyan/20">
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-foreground dark:text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-electric-cyan drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]" />
      </div>
    </div>
  );
};

export default ThemeToggle;
