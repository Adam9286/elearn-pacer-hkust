import { Check, Palette } from "lucide-react";
import { useTheme, themeConfig, lightThemes, darkThemes, Theme } from "@/components/ThemeProvider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const ThemeSwatch = ({ 
  themeId, 
  isActive, 
  onClick 
}: { 
  themeId: Theme; 
  isActive: boolean; 
  onClick: () => void;
}) => {
  const config = themeConfig[themeId];
  
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-muted/50 transition-all duration-200"
      title={config.name}
    >
      <div 
        className={`relative w-10 h-10 rounded-full border-2 transition-all duration-200 ${
          isActive 
            ? "border-primary ring-2 ring-primary/30 scale-110" 
            : "border-border group-hover:border-primary/50 group-hover:scale-105"
        }`}
        style={{ backgroundColor: config.bg }}
      >
        {/* Accent dot */}
        <div 
          className="absolute bottom-1 right-1 w-3 h-3 rounded-full border border-white/50"
          style={{ backgroundColor: config.accent }}
        />
        {/* Checkmark for active theme */}
        {isActive && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Check className="w-5 h-5 text-primary drop-shadow-md" />
          </div>
        )}
      </div>
      <span className={`text-xs font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
        {config.name}
      </span>
    </button>
  );
};

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="relative flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 border-2 border-primary/30 hover:border-primary/60 hover:shadow-[0_0_20px_rgba(0,255,255,0.2)] transition-all duration-300"
        >
          <Palette className="h-4 w-4" />
          <span className="text-sm font-semibold hidden sm:inline tracking-wide">Theme</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <div className="space-y-4">
          {/* Light Themes */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-foreground">Light Themes</h4>
            <div className="grid grid-cols-4 gap-1">
              {lightThemes.map((t) => (
                <ThemeSwatch
                  key={t}
                  themeId={t}
                  isActive={theme === t}
                  onClick={() => setTheme(t)}
                />
              ))}
            </div>
          </div>
          
          <Separator />
          
          {/* Dark Themes */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-foreground">Dark Themes</h4>
            <div className="grid grid-cols-4 gap-1">
              {darkThemes.map((t) => (
                <ThemeSwatch
                  key={t}
                  themeId={t}
                  isActive={theme === t}
                  onClick={() => setTheme(t)}
                />
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ThemeToggle;
