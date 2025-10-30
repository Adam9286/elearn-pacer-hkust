import { useState } from "react";
import { BookOpen, MessageSquare, FileText, Award, TrendingUp, Info, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import ChatMode from "@/components/ChatMode";
import CourseMode from "@/components/CourseMode";
import MockExamMode from "@/components/MockExamMode";
import UserStats from "@/components/UserStats";
import HowItWorks from "@/components/HowItWorks";
import ThemeToggle from "@/components/ThemeToggle";
import { ThemeProvider } from "@/components/ThemeProvider";

const Index = () => {
  const [activeMode, setActiveMode] = useState("chat");

  return (
    <ThemeProvider defaultTheme="dark">
      <div className="min-h-screen bg-background">
      {/* Header with improved contrast */}
      <header className="bg-gradient-to-r from-navy/95 to-dark-void/95 backdrop-blur-md text-white shadow-lg sticky top-0 z-50 border-b border-white/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                to="/" 
                className="flex items-center gap-2 text-sm text-white/90 hover:text-white transition-colors hover:bg-white/10 px-3 py-2 rounded-lg"
              >
                <Home className="w-4 h-4" />
                <span className="font-medium">Home</span>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center shadow-glow">
                  <BookOpen className="w-6 h-6 text-navy" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">LearningPacer</h1>
                  <p className="text-sm text-white/80">ELEC3120: Computer Networks</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <ThemeToggle />
              <UserStats />
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
            <CardDescription className="text-base">
              Master ELEC3120 with personalized learning paths, adaptive quizzes, and instant answers
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Mode Selector */}
        <Tabs value={activeMode} onValueChange={setActiveMode} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-auto p-2 glass-card">
            <TabsTrigger 
              value="chat" 
              className="flex items-center gap-2 py-3 data-[state=active]:gradient-primary data-[state=active]:text-white transition-smooth"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-semibold">Chat Mode</span>
            </TabsTrigger>
            <TabsTrigger 
              value="course" 
              className="flex items-center gap-2 py-3 data-[state=active]:gradient-primary data-[state=active]:text-white transition-smooth"
            >
              <BookOpen className="w-5 h-5" />
              <span className="font-semibold">Course Mode</span>
            </TabsTrigger>
            <TabsTrigger 
              value="exam" 
              className="flex items-center gap-2 py-3 data-[state=active]:gradient-primary data-[state=active]:text-white transition-smooth"
            >
              <FileText className="w-5 h-5" />
              <span className="font-semibold">Mock Exam</span>
            </TabsTrigger>
            <TabsTrigger 
              value="info" 
              className="flex items-center gap-2 py-3 data-[state=active]:gradient-accent data-[state=active]:text-navy transition-smooth"
            >
              <Info className="w-5 h-5" />
              <span className="font-semibold">How It Works</span>
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

          <TabsContent value="info" className="mt-6">
            <HowItWorks />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t bg-card/50">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p className="text-sm">
            LearningPacer • ELEC3120 Final Year Project • The Hong Kong University of Science and Technology
          </p>
        </div>
      </footer>
      </div>
    </ThemeProvider>
  );
};

export default Index;
