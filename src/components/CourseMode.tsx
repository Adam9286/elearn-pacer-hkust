import { useEffect } from "react";
import { Lock, CheckCircle, Circle, LogIn, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUserProgress } from "@/contexts/UserProgressContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { chapters } from "@/data/courseContent";

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
    refetch
  } = useUserProgress();

  // Refetch progress when component mounts and user is available
  useEffect(() => {
    if (user) {
      refetch();
    }
  }, [user]);

  const handleUnitClick = (unitId: number) => {
    if (isChapterUnlocked(unitId)) {
      navigate(`/platform/lesson/${unitId}-1`);
    }
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
      {/* Dev Mode Toggle */}
      {user && (
        <div className="flex items-center justify-end gap-3 px-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wrench className="h-4 w-4" />
            <span>Dev Mode</span>
          </div>
          <Switch
            checked={devMode}
            onCheckedChange={setDevMode}
          />
          {devMode && (
            <Badge variant="outline" className="border-yellow-500 text-yellow-500">
              All sections unlocked
            </Badge>
          )}
        </div>
      )}

      {/* Course Progress Overview */}
      <Card className="glass-card shadow-lg border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Your Learning Path</CardTitle>
              <CardDescription>Complete all lectures to unlock the next section</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">{overallProgress}%</div>
              <p className="text-sm text-muted-foreground">Overall Progress</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={overallProgress} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">
            {completedChapters} of {chapters.length} sections completed
          </p>
        </CardContent>
      </Card>

      {/* Sections */}
      <div className="grid gap-6">
        {chapters.map((chapter) => {
          const unlocked = isChapterUnlocked(chapter.id);
          const complete = isSectionComplete(chapter.id);
          const lessonsCompleted = getLessonsCompleted(chapter.id);
          const totalLessons = getTotalLessons(chapter.id);
          const progressPercent = totalLessons > 0 ? Math.round((lessonsCompleted / totalLessons) * 100) : 0;

          return (
            <Card
              key={chapter.id}
              className={`transition-smooth glass-card ${
                !unlocked
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:shadow-glow cursor-pointer"
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {complete ? (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      ) : !unlocked ? (
                        <Lock className="w-6 h-6 text-muted-foreground" />
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
                  {unlocked && (
                    <Button variant="outline" className="ml-4" onClick={() => handleUnitClick(chapter.id)}>
                      {complete ? "Review" : lessonsCompleted > 0 ? "Continue" : "Start"}
                    </Button>
                  )}
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
                      variant={!unlocked ? "outline" : "secondary"}
                      className="transition-smooth"
                    >
                      {topic}
                    </Badge>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">
                  {totalLessons} lecture{totalLessons !== 1 ? 's' : ''}
                </div>
                {!unlocked && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                    <Lock className="w-4 h-4" />
                    <span>Complete all lectures in Section {chapter.id - 1} to unlock</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CourseMode;
