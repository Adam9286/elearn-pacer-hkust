import { useState, useEffect } from "react";
import { BookOpen, MessageSquare, FileText, Info, Home, LogIn, LogOut, Send, Lightbulb, Activity, GitCompareArrows, MoreHorizontal } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import ChatMode from "@/components/ChatMode";
import CourseMode from "@/components/CourseMode";
import MockExamMode from "@/components/MockExamMode";
import HowItWorks from "@/components/HowItWorks";
import SimulationsMode from "@/components/SimulationsMode";
import Feedback from "@/components/Feedback";
import CompareMode from "@/components/compare/CompareMode";
import ThemeToggle from "@/components/ThemeToggle";
import AccountSettings from "@/components/AccountSettings";
import AdminDropdown from "@/components/AdminDropdown";
import StudyToolsStrip from "@/components/platform/StudyToolsStrip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useUserProgress } from "@/contexts/UserProgressContext";
import { platformModeSummaries } from "@/data/platformContent";
import { externalSupabase } from "@/lib/externalSupabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const studyTips = [
  "Start with 'Why' before 'How' — understanding the problem makes memorizing easier.",
  "Draw packet flows yourself before checking slides — active recall beats passive reading.",
  "TCP is like the HKUST minibus — it waits, confirms you're on, and won't leave anyone behind. UDP? That's the MTR, it runs whether you're ready or not.",
  "Think of packet routing like finding LG7 from your hall — multiple paths exist, routers just pick the fastest one available.",
  "Canvas notifications = broadcast, WhatsApp group = multicast, DM your groupmate = unicast.",
  "When stuck, think in layers: Physical (cables) → Link (WiFi) → Network (routing) → Transport (TCP/UDP) → Application (your app).",
];

const overflowModes = ["info", "feedback"];

const Index = () => {
  const navigate = useNavigate();
  const { user } = useUserProgress();
  const location = useLocation();
  const initialMode = (location.state as { mode?: string })?.mode || "chat";
  const [activeMode, setActiveMode] = useState(initialMode);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (location.state?.mode) {
      setActiveMode(location.state.mode);
    }
  }, [location.state]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % studyTips.length);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ThemeProvider defaultTheme="midnight">
      <div className="min-h-screen bg-background">
      {/* Header with improved contrast */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/85 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Home className="w-4 h-4" />
                <span className="font-medium">Home</span>
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-glow">
                  <BookOpen className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">LearningPacer</h1>
                  <p className="text-sm text-muted-foreground">ELEC3120: Computer Networks</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="hidden text-sm text-muted-foreground sm:block">
                    {user.email}
                  </span>
                  <AdminDropdown />
                  <AccountSettings userEmail={user.email || ""} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await externalSupabase.auth.signOut();
                      toast.success("Signed out successfully");
                      navigate("/");
                    }}
                    className="flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </Button>
                </div>
              ) : (
                <Button
                  asChild
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Link to="/auth">
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </Link>
                </Button>
              )}
              
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4">
        {/* Compact study tip strip */}
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-accent/20 bg-accent/5 px-4 py-2.5">
          <Lightbulb className="h-4 w-4 shrink-0 text-accent" />
          <p
            key={tipIndex}
            className="min-w-0 truncate text-sm italic text-foreground/80 animate-fade-in"
          >
            {studyTips[tipIndex]}
          </p>
        </div>

        <StudyToolsStrip />

        {/* Mode Selector */}
        <Tabs value={activeMode} onValueChange={setActiveMode} className="space-y-4">
          <TabsList className="flex h-auto w-full items-center gap-2 rounded-xl border border-border bg-muted/40 p-2">
            <TabsTrigger
              value="chat"
              className="flex flex-1 items-center gap-2 py-3 text-muted-foreground transition-smooth hover:bg-accent/10 hover:text-foreground data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-semibold hidden sm:inline">{platformModeSummaries.chat.label}</span>
            </TabsTrigger>
            <TabsTrigger
              value="compare"
              className="flex flex-1 items-center gap-2 py-3 text-muted-foreground transition-smooth hover:bg-accent/10 hover:text-foreground data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground"
            >
              <GitCompareArrows className="w-5 h-5" />
              <span className="font-semibold hidden sm:inline">{platformModeSummaries.compare.label}</span>
            </TabsTrigger>
            <TabsTrigger
              value="course"
              className="flex flex-1 items-center gap-2 py-3 text-muted-foreground transition-smooth hover:bg-accent/10 hover:text-foreground data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground"
            >
              <BookOpen className="w-5 h-5" />
              <span className="font-semibold hidden sm:inline">{platformModeSummaries.course.label}</span>
            </TabsTrigger>
            <TabsTrigger
              value="exam"
              className="flex flex-1 items-center gap-2 py-3 text-muted-foreground transition-smooth hover:bg-accent/10 hover:text-foreground data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground"
            >
              <FileText className="w-5 h-5" />
              <span className="font-semibold hidden sm:inline">{platformModeSummaries.exam.label}</span>
            </TabsTrigger>
            <TabsTrigger
              value="simulations"
              className="flex flex-1 items-center gap-2 py-3 text-muted-foreground transition-smooth hover:bg-accent/10 hover:text-foreground data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground"
            >
              <Activity className="w-5 h-5" />
              <span className="font-semibold hidden sm:inline">{platformModeSummaries.simulations.label}</span>
            </TabsTrigger>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Open more platform modes"
                  className={cn(
                    "ml-auto inline-flex h-11 items-center justify-center whitespace-nowrap rounded-md px-3 py-3 text-sm font-medium text-muted-foreground ring-offset-background transition-all hover:bg-accent/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    overflowModes.includes(activeMode) && "bg-accent/15 text-foreground",
                  )}
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 border-border bg-popover text-popover-foreground"
              >
                <DropdownMenuItem
                  onSelect={() => setActiveMode("info")}
                  className={cn(
                    "gap-2 focus:bg-accent/15 focus:text-foreground",
                    activeMode === "info" && "bg-accent/15 text-foreground",
                  )}
                >
                  <Info className="h-4 w-4" />
                  <span>How It Works</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setActiveMode("feedback")}
                  className={cn(
                    "gap-2 focus:bg-accent/15 focus:text-foreground",
                    activeMode === "feedback" && "bg-accent/15 text-foreground",
                  )}
                >
                  <Send className="h-4 w-4" />
                  <span>Feedback</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TabsList>

          <TabsContent value="chat" className="mt-3">
            <ChatMode />
          </TabsContent>

          <TabsContent value="compare" className="mt-3">
            <CompareMode />
          </TabsContent>

          <TabsContent value="course" className="mt-3">
            <CourseMode />
          </TabsContent>

          <TabsContent value="exam" className="mt-3">
            <MockExamMode />
          </TabsContent>

          <TabsContent value="simulations" className="mt-3">
            <SimulationsMode />
          </TabsContent>

          <TabsContent value="feedback" className="mt-3">
            <Feedback />
          </TabsContent>

          <TabsContent value="info" className="mt-3">
            <HowItWorks />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t bg-card/50">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p className="text-sm">
            LearningPacer • ELEC3120 Learning Platform • The Hong Kong University of Science and Technology
          </p>
        </div>
      </footer>
      </div>
    </ThemeProvider>
  );
};

export default Index;
