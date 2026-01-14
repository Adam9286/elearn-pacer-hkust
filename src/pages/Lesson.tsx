import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, Circle, Clock, FileText, LogIn, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ThemeProvider } from "@/components/ThemeProvider";
import ThemeToggle from "@/components/ThemeToggle";
import { useUserProgress } from "@/contexts/UserProgressContext";
import { toast } from "sonner";
import { chapters, findLesson } from "@/data/courseContent";
import GuidedLearning from "@/components/lesson/GuidedLearning";

const Lesson = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [lessonProgress, setLessonProgress] = useState(0);
  const { user, loading, markLessonComplete, getChapterProgress, isChapterUnlocked, isSectionComplete, getLessonsCompleted, getTotalLessons } = useUserProgress();

  // Find current lesson and chapter using helper
  const lessonData = lessonId ? findLesson(lessonId) : null;
  const currentChapter = lessonData?.chapter ?? null;
  const currentLesson = lessonData?.lesson ?? null;
  const lessonIndex = lessonData?.lessonIndex ?? -1;

  // Check if chapter is locked (only after progress has loaded)
  const chapterLocked = currentChapter && !loading ? !isChapterUnlocked(currentChapter.id) : false;

  useEffect(() => {
    if (!loading && chapterLocked && currentChapter) {
      toast.error(`Section ${currentChapter.id} is locked. Complete the previous section first.`);
      navigate("/platform", { state: { mode: "course" } });
    }
  }, [loading, chapterLocked, currentChapter, navigate]);

  if (!currentLesson || !currentChapter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Lesson Not Found</CardTitle>
            <CardDescription>The requested lesson could not be found.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/platform")}>Back to Platform</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const previousLesson = lessonIndex > 0 ? currentChapter.lessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < currentChapter.lessons.length - 1 ? currentChapter.lessons[lessonIndex + 1] : null;
  const isLastLesson = lessonIndex === currentChapter.lessons.length - 1;

  const handleMarkComplete = async () => {
    if (user && currentChapter && currentLesson) {
      await markLessonComplete(currentChapter.id, currentLesson.id);
      toast.success("Lesson completed!");
    }
    setLessonProgress(100);
    
    if (nextLesson) {
      navigate(`/platform/lesson/${nextLesson.id}`);
    } else {
      // Last lesson in section - check if section is now complete
      if (user) {
        toast.success(`Section ${currentChapter.id} completed! Next section unlocked!`);
      }
      navigate("/platform", { state: { mode: "course" } });
    }
  };

  const chapterProgress = currentChapter ? getChapterProgress(currentChapter.id) : undefined;
  const lessonsCompleted = getLessonsCompleted(currentChapter.id);
  const totalLessons = getTotalLessons(currentChapter.id);
  const sectionProgressPercent = totalLessons > 0 ? Math.round((lessonsCompleted / totalLessons) * 100) : 0;

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/platform", { state: { mode: "course" } })}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Course
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-sm font-semibold">Section {currentChapter.id}</h1>
                <p className="text-xs text-muted-foreground">{currentChapter.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {!user && (
                <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </Button>
              )}
              <ThemeToggle />
            </div>
          </div>
        </header>

        <div className="container grid grid-cols-1 lg:grid-cols-4 gap-6 p-6">
          {/* Sidebar - Chapter Navigation */}
          <aside className="lg:col-span-1">
            <Card className="glass-card sticky top-20">
              <CardHeader>
                <CardTitle className="text-lg">Section {currentChapter.id} Lessons</CardTitle>
                {currentChapter.textbookPages && (
                  <CardDescription>Textbook: p.{currentChapter.textbookPages}</CardDescription>
                )}
                <div className="mt-2">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span className="font-medium">{lessonsCompleted}/{totalLessons}</span>
                  </div>
                  <Progress value={sectionProgressPercent} className="h-2" />
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-16rem)]">
                  <div className="space-y-2">
                    {currentChapter.lessons.map((lesson) => {
                      const isCompleted = chapterProgress?.lessons_completed?.includes(lesson.id);
                      return (
                        <Button
                          key={lesson.id}
                          variant={lesson.id === lessonId ? "secondary" : "ghost"}
                          className="w-full justify-start"
                          onClick={() => navigate(`/platform/lesson/${lesson.id}`)}
                        >
                          {isCompleted ? (
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                          ) : (
                            <Circle className="mr-2 h-4 w-4" />
                          )}
                          <div className="text-left flex-1">
                            <div className="text-sm font-medium">{lesson.number}</div>
                            <div className="text-xs text-muted-foreground truncate">{lesson.title}</div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3 space-y-6">
            {/* Lesson Header */}
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{currentLesson.number}</Badge>
                    </div>
                    <CardTitle className="text-2xl mb-2">{currentLesson.title}</CardTitle>
                    <CardDescription className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {currentLesson.estimatedMinutes} min
                      </span>
                      {currentLesson.textbookSections && (
                        <span>Textbook: {currentLesson.textbookSections}</span>
                      )}
                    </CardDescription>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Your Progress</span>
                    <span className="text-sm font-bold text-primary">{lessonProgress}%</span>
                  </div>
                  <Progress value={lessonProgress} className="h-2" />
                </div>
              </CardHeader>
            </Card>

            {/* Lesson Content Tabs */}
            <Card className="glass-card">
              <Tabs defaultValue="overview" className="w-full">
                <CardHeader className="pb-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="ai-tutor" className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      AI Tutor
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>

                <CardContent className="pt-0">
                  <TabsContent value="overview" className="mt-0">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Learning Objectives</h3>
                        <ul className="space-y-2">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                            <span>Understand the core concepts of {currentLesson.title}</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Circle className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <span>Apply knowledge to practical scenarios</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Circle className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <span>Prepare for the next lecture</span>
                          </li>
                        </ul>
                      </div>

                      {currentLesson.pdfUrl && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Lecture Slides</h3>
                          <div className="aspect-video rounded-lg overflow-hidden border">
                            <iframe
                              src={currentLesson.pdfUrl}
                              className="w-full h-full"
                              title={`${currentLesson.title} Lecture Slides`}
                              allow="autoplay"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between pt-4">
                        {previousLesson ? (
                          <Button variant="outline" onClick={() => navigate(`/platform/lesson/${previousLesson.id}`)}>
                            Previous: {previousLesson.title}
                          </Button>
                        ) : (
                          <div />
                        )}
                        {nextLesson ? (
                          <Button onClick={handleMarkComplete}>
                            Next: {nextLesson.title}
                          </Button>
                        ) : (
                          <Button onClick={handleMarkComplete}>
                            Complete Section
                          </Button>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="ai-tutor" className="mt-0">
                    <GuidedLearning 
                      lesson={currentLesson} 
                      chapter={currentChapter}
                      onComplete={handleMarkComplete}
                    />
                  </TabsContent>

                </CardContent>
              </Tabs>
            </Card>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default Lesson;
