import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/15 transition-smooth">
      <span className="text-sm font-medium text-white/90 hidden sm:inline">Theme</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        className="relative w-9 h-9 rounded-full transition-all duration-300 hover:scale-110 hover:bg-white/20"
        title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      >
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-white" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-white" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    </div>
  );
};

export default ThemeToggle;
