import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, Circle, Clock, FileText, LogIn } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ThemeProvider } from "@/components/ThemeProvider";
import ThemeToggle from "@/components/ThemeToggle";
import ChapterQuiz from "@/components/ChapterQuiz";
import { useUserProgress } from "@/hooks/useUserProgress";
import { toast } from "sonner";
import { chapters, findLesson } from "@/data/courseContent";

const Lesson = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [lessonProgress, setLessonProgress] = useState(0);
  const { user, updateQuizScore, markLessonComplete, getChapterProgress, isChapterUnlocked } = useUserProgress();

  // Find current lesson and chapter using helper
  const lessonData = lessonId ? findLesson(lessonId) : null;
  const currentChapter = lessonData?.chapter ?? null;
  const currentLesson = lessonData?.lesson ?? null;
  const lessonIndex = lessonData?.lessonIndex ?? -1;

  // Check if chapter is locked
  const chapterLocked = currentChapter ? !isChapterUnlocked(currentChapter.id) : false;

  useEffect(() => {
    if (chapterLocked && currentChapter) {
      toast.error(`Section ${currentChapter.id} is locked. Complete the previous section quiz first.`);
      navigate("/platform");
    }
  }, [chapterLocked, currentChapter, navigate]);

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

  const handleMarkComplete = async () => {
    if (user && currentChapter && currentLesson) {
      await markLessonComplete(currentChapter.id, currentLesson.id);
    }
    setLessonProgress(100);
    if (nextLesson) {
      navigate(`/platform/lesson/${nextLesson.id}`);
    } else {
      navigate("/platform");
    }
  };

  const handleQuizComplete = async (passed: boolean, score: number) => {
    if (user && currentChapter) {
      const result = await updateQuizScore(currentChapter.id, score, 5);
      if (result && typeof result === 'object' && 'passed' in result) {
        if (result.passed) {
          toast.success(`Section ${currentChapter.id} completed! Next section unlocked!`);
        } else {
          toast.info(`You scored ${result.percentage}%. Need 80% to unlock the next section.`);
        }
      }
    }
  };

  const chapterProgress = currentChapter ? getChapterProgress(currentChapter.id) : undefined;

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
                {chapterProgress?.quiz_passed && (
                  <Badge variant="default" className="bg-green-500 w-fit">
                    Quiz Passed: {chapterProgress.quiz_score}%
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-16rem)]">
                  <div className="space-y-2">
                    {currentChapter.lessons.map((lesson) => (
                      <Button
                        key={lesson.id}
                        variant={lesson.id === lessonId ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => navigate(`/platform/lesson/${lesson.id}`)}
                      >
                        {lesson.contentType === "review" ? (
                          <CheckCircle className="mr-2 h-4 w-4" />
                        ) : (
                          <Circle className="mr-2 h-4 w-4" />
                        )}
                        <div className="text-left flex-1">
                          <div className="text-sm font-medium">{lesson.number}</div>
                          <div className="text-xs text-muted-foreground truncate">{lesson.title}</div>
                        </div>
                      </Button>
                    ))}
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
                      {currentLesson.contentType === "review" && <Badge variant="secondary">Review & Quiz</Badge>}
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
              <Tabs defaultValue={currentLesson.contentType === "review" ? "quiz" : "overview"} className="w-full">
                <CardHeader className="pb-4">
                  <TabsList className={`grid w-full ${currentLesson.contentType === "review" ? "grid-cols-3" : "grid-cols-5"}`}>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    {currentLesson.contentType !== "review" && (
                      <>
                        <TabsTrigger value="lecture">Lecture Notes</TabsTrigger>
                        <TabsTrigger value="chat">AI Tutor</TabsTrigger>
                        <TabsTrigger value="practice">Practice</TabsTrigger>
                      </>
                    )}
                    <TabsTrigger value="quiz">Quiz</TabsTrigger>
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
                            <span>Prepare for the section quiz</span>
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
                          <Button onClick={handleMarkComplete}>Complete Section</Button>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {currentLesson.contentType !== "review" && (
                    <>
                      <TabsContent value="lecture" className="mt-0">
                        <div className="space-y-6">
                          {currentLesson.pdfUrl ? (
                            <div className="aspect-video rounded-lg overflow-hidden border">
                              <iframe
                                src={currentLesson.pdfUrl}
                                className="w-full h-full"
                                title={`${currentLesson.title} Lecture Slides`}
                                allow="autoplay"
                              />
                            </div>
                          ) : (
                            <div className="text-center py-12 text-muted-foreground">
                              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>Lecture notes for this section will be available soon.</p>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="chat" className="mt-0">
                        <div className="text-center py-12 text-muted-foreground">
                          <p>AI Tutor - Ask questions about {currentLesson.title}</p>
                          <p className="text-sm mt-2">Use the Chat mode on the main platform for AI assistance.</p>
                        </div>
                      </TabsContent>

                      <TabsContent value="practice" className="mt-0">
                        <div className="text-center py-12 text-muted-foreground">
                          <p>Practice problems for {currentLesson.title} coming soon.</p>
                        </div>
                      </TabsContent>
                    </>
                  )}

                  <TabsContent value="quiz" className="mt-0">
                    <ChapterQuiz
                      chapterId={currentChapter.id}
                      chapterTitle={currentChapter.title}
                      onQuizComplete={handleQuizComplete}
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
