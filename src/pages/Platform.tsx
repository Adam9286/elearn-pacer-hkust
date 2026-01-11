import { useState, useEffect } from "react";
import { BookOpen, MessageSquare, FileText, Info, Home, LogIn, LogOut, Users } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import ChatMode from "@/components/ChatMode";
import CourseMode from "@/components/CourseMode";
import MockExamMode from "@/components/MockExamMode";
import HowItWorks from "@/components/HowItWorks";
import Community from "@/components/Community";
import ThemeToggle from "@/components/ThemeToggle";
import AccountSettings from "@/components/AccountSettings";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useUserProgress } from "@/contexts/UserProgressContext";
import { externalSupabase } from "@/lib/externalSupabase";
import { toast } from "sonner";

const studyTips = [
  "TCP is like the HKUST minibus — it waits, confirms you're on, and won't leave anyone behind. UDP? That's the MTR, it runs whether you're ready or not.",
  "Think of packet routing like finding LG7 from your hall — multiple paths exist, routers just pick the fastest one available.",
  "The CYT elevator during class change is basically network congestion — too many packets, not enough bandwidth. That's why we need flow control!",
  "Canvas notifications = broadcast, WhatsApp group = multicast, DM your groupmate = unicast. You already understand addressing modes.",
  "Draw the packet flow like you'd draw directions to the Red Bird — sketching it yourself beats memorizing someone else's map.",
  "Review quiz mistakes like debugging code — each error tells you exactly where your understanding has gaps.",
  "When stuck, think in layers: Physical (cables) → Link (WiFi) → Network (routing) → Transport (TCP/UDP) → Application (your app).",
];

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
    <ThemeProvider defaultTheme="dark">
      <div className="min-h-screen bg-background">
      {/* Header with improved contrast */}
      <header className="bg-gradient-to-r from-navy/95 to-dark-void/95 dark:bg-gradient-to-r dark:from-navy/95 dark:to-dark-void/95 light:bg-white/95 light:border-b light:border-gray-200 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-white/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                to="/" 
                className="flex items-center gap-2 text-sm dark:text-white/90 text-gray-800 dark:hover:text-white hover:text-gray-900 transition-colors dark:hover:bg-white/10 hover:bg-gray-100 px-3 py-2 rounded-lg"
              >
                <Home className="w-4 h-4" />
                <span className="font-medium">Home</span>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center shadow-glow">
                  <BookOpen className="w-6 h-6 text-navy" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold dark:text-white text-gray-900">LearningPacer</h1>
                  <p className="text-sm dark:text-white/80 text-gray-700">ELEC3120: Computer Networks</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm dark:text-white/80 text-gray-700 hidden sm:block">
                    {user.email}
                  </span>
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
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Card */}
        <Card className="mb-8 glass-card border-2 shadow-lg transition-smooth hover:shadow-glow">
          <CardHeader>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Welcome to Your AI Teaching Assistant
            </CardTitle>
            <CardDescription className="text-base transition-opacity duration-500">
              💡 {studyTips[tipIndex]}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Mode Selector */}
        <Tabs value={activeMode} onValueChange={setActiveMode} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 h-auto p-2 glass-card">
            <TabsTrigger 
              value="chat" 
              className="flex items-center gap-2 py-3 data-[state=active]:gradient-primary data-[state=active]:text-white transition-smooth"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-semibold hidden sm:inline">Chat Mode</span>
            </TabsTrigger>
            <TabsTrigger 
              value="course" 
              className="flex items-center gap-2 py-3 data-[state=active]:gradient-primary data-[state=active]:text-white transition-smooth"
            >
              <BookOpen className="w-5 h-5" />
              <span className="font-semibold hidden sm:inline">Course Mode</span>
            </TabsTrigger>
            <TabsTrigger 
              value="exam" 
              className="flex items-center gap-2 py-3 data-[state=active]:gradient-primary data-[state=active]:text-white transition-smooth"
            >
              <FileText className="w-5 h-5" />
              <span className="font-semibold hidden sm:inline">Mock Exam</span>
            </TabsTrigger>
            <TabsTrigger 
              value="community" 
              className="flex items-center gap-2 py-3 data-[state=active]:gradient-primary data-[state=active]:text-white transition-smooth"
            >
              <Users className="w-5 h-5" />
              <span className="font-semibold hidden sm:inline">Community</span>
            </TabsTrigger>
            <TabsTrigger 
              value="info" 
              className="flex items-center gap-2 py-3 data-[state=active]:gradient-accent data-[state=active]:text-navy transition-smooth"
            >
              <Info className="w-5 h-5" />
              <span className="font-semibold hidden sm:inline">How It Works</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-6">
            <ChatMode />
          </TabsContent>

          <TabsContent value="course" className="mt-6">
            <CourseMode />
          </TabsContent>

          <TabsContent value="exam" className="mt-6">
            <MockExamMode />
          </TabsContent>

          <TabsContent value="community" className="mt-6">
            <Community />
          </TabsContent>

          <TabsContent value="info" className="mt-6">
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
