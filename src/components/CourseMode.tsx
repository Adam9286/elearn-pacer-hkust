import { useEffect } from "react";
import { CheckCircle, Circle, LogIn, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUserProgress } from "@/contexts/UserProgressContext";
import { Skeleton } from "@/components/ui/skeleton";
import { chapters } from "@/data/courseContent";
import { motion } from "framer-motion";
import { AnimatedParticles } from "@/components/ui/AnimatedParticles";

const CourseMode = () => {
  const navigate = useNavigate();
  const { 
    user, 
    loading, 
    isChapterUnlocked, 
    isSectionComplete,
    getLessonsCompleted,
    getTotalLessons,
    devMode, 
    setDevMode,
    isAdmin,
    refetch
  } = useUserProgress();

  // Refetch progress when component mounts and user is available
  useEffect(() => {
    if (user) {
      refetch();
    }
  }, [user]);

  const handleUnitClick = (unitId: number) => {
    navigate(`/platform/lesson/${unitId}-1`);
  };

  // Calculate overall progress based on completed sections
  const completedChapters = chapters.filter(c => isSectionComplete(c.id)).length;
  const overallProgress = Math.round((completedChapters / chapters.length) * 100);

  if (!user) {
    return (
      <Card className="glass-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign In Required</CardTitle>
          <CardDescription>
            Create an account to track your learning progress and unlock sections
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={() => navigate("/auth")} size="lg">
            <LogIn className="mr-2 h-4 w-4" />
            Sign In to Continue
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="glass-card">
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-3 w-full" />
          </CardContent>
        </Card>
        {[1, 2, 3].map(i => (
          <Card key={i} className="glass-card">
            <CardHeader>
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-48 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Animated Learning Path Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="glass-card shadow-lg border-2 overflow-hidden relative">
          {/* Animated background particles - memoized for performance */}
          <AnimatedParticles count={20} className="bg-primary/20" />
          
          <CardHeader className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <CardTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Your Learning Path
              </CardTitle>
            </div>
            <CardDescription>All sections are accessible</CardDescription>
          </CardHeader>
          
          <CardContent className="relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              {/* Circular Progress Ring */}
              <div className="relative flex-shrink-0">
                <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 120 120">
                  {/* Background circle */}
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted/20"
                  />
                  {/* Progress circle */}
                  <motion.circle
                    cx="60"
                    cy="60"
                    r="52"
                    stroke="url(#progressGradient)"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: "326.7", strokeDashoffset: 326.7 }}
                    animate={{ strokeDashoffset: 326.7 - (326.7 * overallProgress) / 100 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                  {/* Gradient definition */}
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--accent))" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span 
                    className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                  >
                    {overallProgress}%
                  </motion.span>
                  <span className="text-xs text-muted-foreground">Complete</span>
                </div>
                {/* Glow effect */}
                {overallProgress > 0 && (
                  <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl animate-pulse" />
                )}
              </div>
              
              {/* Section indicators and stats */}
              <div className="flex-1 space-y-4">
                {/* Section milestone dots */}
                <div className="flex items-center justify-center lg:justify-start gap-2 flex-wrap">
                  {chapters.map((chapter, index) => {
                    const isComplete = isSectionComplete(chapter.id);
                    return (
                      <motion.div
                        key={chapter.id}
                        className="relative group"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 cursor-pointer
                            ${isComplete 
                              ? "bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg shadow-green-500/30" 
                              : "bg-muted/40 text-muted-foreground border border-muted-foreground/20"
                            }`}
                          onClick={() => handleUnitClick(chapter.id)}
                        >
                          {isComplete ? "✓" : chapter.id}
                        </div>
                        {/* Tooltip */}
                        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                          {chapter.title}
                        </div>
                        {/* Connecting line */}
                        {index < chapters.length - 1 && (
                          <div className={`absolute top-1/2 left-full w-2 h-0.5 transform -translate-y-1/2
                            ${isComplete ? "bg-green-500" : "bg-muted/30"}`} 
                          />
                        )}
                      </motion.div>
                    );
                  })}
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <motion.div 
                    className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="text-2xl font-bold text-primary">{completedChapters}</div>
                    <div className="text-sm text-muted-foreground">Sections Complete</div>
                  </motion.div>
                  <motion.div 
                    className="p-4 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="text-2xl font-bold text-accent">{chapters.length - completedChapters}</div>
                    <div className="text-sm text-muted-foreground">Sections Remaining</div>
                  </motion.div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sections */}
      <div className="grid gap-6">
        {chapters.map((chapter) => {
          const complete = isSectionComplete(chapter.id);
          const lessonsCompleted = getLessonsCompleted(chapter.id);
          const totalLessons = getTotalLessons(chapter.id);
          const progressPercent = totalLessons > 0 ? Math.round((lessonsCompleted / totalLessons) * 100) : 0;

          return (
            <Card
              key={chapter.id}
              className="transition-smooth glass-card hover:shadow-glow cursor-pointer"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {complete ? (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      ) : (
                        <Circle className="w-6 h-6 text-primary" />
                      )}
                      <Badge variant="outline" className="text-xs">
                        Section {chapter.id}
                      </Badge>
                      <CardTitle className="text-xl">{chapter.title}</CardTitle>
                      {complete && (
                        <Badge variant="default" className="bg-green-500">
                          Complete ✓
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{chapter.description}</CardDescription>
                  </div>
                  <Button variant="outline" className="ml-4" onClick={() => handleUnitClick(chapter.id)}>
                    {complete ? "Review" : lessonsCompleted > 0 ? "Continue" : "Start"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm font-bold text-primary">
                      {lessonsCompleted}/{totalLessons} lectures
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {chapter.topics.map((topic, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="transition-smooth"
                    >
                      {topic}
                    </Badge>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">
                  {totalLessons} lecture{totalLessons !== 1 ? 's' : ''}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CourseMode;
