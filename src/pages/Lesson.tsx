import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, Circle, Clock, ChevronRight, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ThemeProvider } from "@/components/ThemeProvider";
import ThemeToggle from "@/components/ThemeToggle";

// Mock data structure matching the course content
const chapters = [
  {
    id: 1,
    title: "Computer Networks and the Internet",
    textbookPages: "1-80",
    lessons: [
      {
        id: "1-1",
        number: "1.1",
        title: "Introduction",
        lectureFile: "01-Introduction",
        pdfUrl: "https://drive.google.com/file/d/1w34TPqz8BftrSc8TEB03RJ5sKOqqnvjq/preview",
        textbookSections: "1.1-1.3",
        estimatedMinutes: 45,
      },
      {
        id: "1-2",
        number: "1.2",
        title: "Web Basics",
        lectureFile: "02-Web",
        pdfUrl: "https://drive.google.com/file/d/1U58Ei-u0b9mkd37Jh6dvsFhWxoI9LZ1c/view?usp=sharing",
        textbookSections: "1.4-1.5",
        estimatedMinutes: 40,
      },
      {
        id: "1-3",
        number: "1.3",
        title: "Video Streaming",
        lectureFile: "04-Video",
        pdfUrl: "https://drive.google.com/file/d/1Ufw6W92LOJZeFleE9X-iOxSqqhnbQ64E/view?usp=sharing",
        textbookSections: "1.6",
        estimatedMinutes: 35,
      },
      {
        id: "1-review",
        number: "1.R",
        title: "Chapter 1 Review",
        contentType: "review",
        textbookSections: "Problems p.64-66",
        estimatedMinutes: 60,
      },
    ],
  },
  {
    id: 2,
    title: "Application Layer",
    textbookPages: "81-180",
    lessons: [
      {
        id: "2-1",
        number: "2.1",
        title: "Principles of Network Applications",
        textbookSections: "2.1",
        estimatedMinutes: 40,
      },
      { id: "2-2", number: "2.2", title: "The Web and HTTP", textbookSections: "2.2", estimatedMinutes: 45 },
      {
        id: "2-review",
        number: "2.R",
        title: "Chapter 2 Review",
        contentType: "review",
        textbookSections: "Problems p.166-175",
        estimatedMinutes: 60,
      },
    ],
  },
  {
    id: 3,
    title: "Transport Layer",
    textbookPages: "181-302",
    lessons: [
      {
        id: "3-1",
        number: "3.1",
        title: "Transport Model",
        lectureFile: "05-Transport_Model",
        textbookSections: "3.1-3.2",
        estimatedMinutes: 45,
      },
      {
        id: "3-2",
        number: "3.2",
        title: "TCP Basics",
        lectureFile: "06-TCP_Basics",
        textbookSections: "3.3-3.4",
        estimatedMinutes: 50,
      },
      {
        id: "3-3",
        number: "3.3",
        title: "Congestion Control",
        lectureFile: "07-Congestion_Control",
        textbookSections: "3.5-3.6",
        estimatedMinutes: 45,
      },
      {
        id: "3-4",
        number: "3.4",
        title: "Advanced Congestion Control",
        lectureFile: "08-AdvancedCC",
        textbookSections: "3.7",
        estimatedMinutes: 40,
      },
      {
        id: "3-5",
        number: "3.5",
        title: "Queue Management",
        lectureFile: "09-Queue",
        textbookSections: "3.8",
        estimatedMinutes: 35,
      },
      {
        id: "3-review",
        number: "3.R",
        title: "Chapter 3 Review",
        contentType: "review",
        textbookSections: "Problems p.284-300",
        estimatedMinutes: 75,
      },
    ],
  },
  {
    id: 4,
    title: "Network Layer - Data Plane",
    textbookPages: "303-376",
    lessons: [
      {
        id: "4-1",
        number: "4.1",
        title: "IP Fundamentals",
        lectureFile: "10-IP",
        textbookSections: "4.1-4.3",
        estimatedMinutes: 50,
      },
      {
        id: "4-review",
        number: "4.R",
        title: "Chapter 4 Review",
        contentType: "review",
        textbookSections: "Problems p.364-374",
        estimatedMinutes: 60,
      },
    ],
  },
  {
    id: 5,
    title: "Network Layer - Control Plane",
    textbookPages: "377-448",
    lessons: [
      {
        id: "5-1",
        number: "5.1",
        title: "BGP Introduction",
        lectureFile: "11-BGP",
        textbookSections: "5.1-5.3",
        estimatedMinutes: 45,
      },
      {
        id: "5-2",
        number: "5.2",
        title: "BGP Advanced",
        lectureFile: "12-BGP2",
        textbookSections: "5.4",
        estimatedMinutes: 40,
      },
      {
        id: "5-3",
        number: "5.3",
        title: "Internet Structure",
        lectureFile: "13-Internet",
        textbookSections: "5.5",
        estimatedMinutes: 35,
      },
      {
        id: "5-review",
        number: "5.R",
        title: "Chapter 5 Review",
        contentType: "review",
        textbookSections: "Problems p.432-445",
        estimatedMinutes: 65,
      },
    ],
  },
  {
    id: 6,
    title: "Link Layer and LANs",
    textbookPages: "449-530",
    lessons: [
      {
        id: "6-1",
        number: "6.1",
        title: "Local Area Networks",
        lectureFile: "14-Local_Area_Network",
        textbookSections: "6.1-6.3",
        estimatedMinutes: 50,
      },
      {
        id: "6-2",
        number: "6.2",
        title: "LAN Routing",
        lectureFile: "15-LAN_Routing",
        textbookSections: "6.4",
        estimatedMinutes: 40,
      },
      {
        id: "6-3",
        number: "6.3",
        title: "Link Layer Challenge",
        lectureFile: "16-Link_Layer_Challenge",
        textbookSections: "6.5-6.6",
        estimatedMinutes: 45,
      },
      {
        id: "6-review",
        number: "6.R",
        title: "Chapter 6 Review",
        contentType: "review",
        textbookSections: "Problems p.519-527",
        estimatedMinutes: 60,
      },
    ],
  },
  {
    id: 7,
    title: "Wireless and Mobile Networks",
    textbookPages: "531-606",
    lessons: [
      {
        id: "7-1",
        number: "7.1",
        title: "Wireless Networks",
        lectureFile: "17-Wireless_Network_updated",
        textbookSections: "7.1-7.4",
        estimatedMinutes: 55,
      },
      {
        id: "7-review",
        number: "7.R",
        title: "Chapter 7 Review",
        contentType: "review",
        textbookSections: "Problems p.596-602",
        estimatedMinutes: 50,
      },
    ],
  },
  {
    id: 8,
    title: "Security and Advanced Topics",
    textbookPages: "607-664",
    lessons: [
      {
        id: "8-1",
        number: "8.1",
        title: "Content Delivery Networks",
        lectureFile: "18-CDN",
        textbookSections: "8.1",
        estimatedMinutes: 40,
      },
      {
        id: "8-2",
        number: "8.2",
        title: "Datacenter Networks",
        lectureFile: "19-Datacenter",
        textbookSections: "8.2",
        estimatedMinutes: 45,
      },
      {
        id: "8-3",
        number: "8.3",
        title: "Security Fundamentals",
        lectureFile: "20-Security",
        textbookSections: "8.3-8.5",
        estimatedMinutes: 50,
      },
      {
        id: "8-4",
        number: "8.4",
        title: "Advanced Security",
        lectureFile: "21-Security2",
        textbookSections: "8.6-8.8",
        estimatedMinutes: 45,
      },
      {
        id: "8-5",
        number: "8.5",
        title: "Real-Time Video",
        lectureFile: "22-Real_Time_Video",
        textbookSections: "8.9",
        estimatedMinutes: 40,
      },
    ],
  },
];

const Lesson = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [lessonProgress, setLessonProgress] = useState(0);

  // Find current lesson and chapter
  let currentChapter = null;
  let currentLesson = null;
  let lessonIndex = -1;

  for (const chapter of chapters) {
    const idx = chapter.lessons.findIndex((l) => l.id === lessonId);
    if (idx !== -1) {
      currentChapter = chapter;
      currentLesson = chapter.lessons[idx];
      lessonIndex = idx;
      break;
    }
  }

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

  const handleMarkComplete = () => {
    setLessonProgress(100);
    if (nextLesson) {
      navigate(`/platform/lesson/${nextLesson.id}`);
    } else {
      navigate("/platform");
    }
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/platform")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Course
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-sm font-semibold">Chapter {currentChapter.id}</h1>
                <p className="text-xs text-muted-foreground">{currentChapter.title}</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="container grid grid-cols-1 lg:grid-cols-4 gap-6 p-6">
          {/* Sidebar - Chapter Navigation */}
          <aside className="lg:col-span-1">
            <Card className="glass-card sticky top-20">
              <CardHeader>
                <CardTitle className="text-lg">Chapter {currentChapter.id} Lessons</CardTitle>
                <CardDescription>Textbook: p.{currentChapter.textbookPages}</CardDescription>
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
                      {currentLesson.contentType === "review" && <Badge variant="secondary">Review</Badge>}
                    </div>
                    <CardTitle className="text-2xl mb-2">{currentLesson.title}</CardTitle>
                    <CardDescription className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {currentLesson.estimatedMinutes} min
                      </span>
                      <span>Textbook: {currentLesson.textbookSections}</span>
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
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="lecture">Lecture Notes</TabsTrigger>
                    <TabsTrigger value="chat">AI Tutor</TabsTrigger>
                    <TabsTrigger value="practice">Practice</TabsTrigger>
                    <TabsTrigger value="review">Review</TabsTrigger>
                  </TabsList>
                </CardHeader>

                <CardContent>
                  <TabsContent value="overview" className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Learning Objectives</h3>
                      <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                        <li>Understand key concepts from textbook sections {currentLesson.textbookSections}</li>
                        {currentLesson.lectureFile && <li>Review lecture materials: {currentLesson.lectureFile}</li>}
                        <li>Apply knowledge through practice problems</li>
                        {currentLesson.contentType === "review" && (
                          <li>Complete homework problems from the textbook</li>
                        )}
                      </ul>
                    </div>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-semibold mb-2">How to Study This Lesson</h3>
                      <ol className="space-y-2 list-decimal list-inside text-muted-foreground">
                        <li>Read the assigned textbook sections</li>
                        {currentLesson.lectureFile && <li>Review the lecture notes in the Lecture Notes tab</li>}
                        <li>Use the AI Tutor to ask questions and clarify concepts</li>
                        <li>Test your understanding with practice questions</li>
                        <li>Complete the review problems</li>
                      </ol>
                    </div>
                  </TabsContent>

                  <TabsContent value="lecture" className="space-y-4">
                    {currentLesson.pdfUrl ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                          <div>
                            <p className="font-medium">{currentLesson.lectureFile}</p>
                            <p className="text-sm text-muted-foreground">Lecture notes PDF</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(currentLesson.pdfUrl, "_blank")}
                            className="gap-2"
                          >
                            <FileText className="h-4 w-4" />
                            Download PDF
                          </Button>
                        </div>
                        <div className="border rounded-lg overflow-hidden bg-muted/20" style={{ height: "800px" }}>
                          <iframe
                            src={currentLesson.pdfUrl}
                            className="w-full h-full"
                            title={`${currentLesson.lectureFile} PDF`}
                            allow="autoplay"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <p>No lecture notes available for this lesson.</p>
                        <p className="text-sm mt-2">Please refer to the textbook sections listed above.</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="chat" className="space-y-4">
                    <div className="border rounded-lg p-8 text-center bg-muted/20">
                      <p className="text-muted-foreground">AI Tutor chat interface will be integrated here</p>
                      <p className="text-sm text-muted-foreground mt-2">Ask questions specific to this lesson</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="practice" className="space-y-4">
                    <div className="border rounded-lg p-8 text-center bg-muted/20">
                      <p className="text-muted-foreground">Practice questions will be generated here</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        AI-generated questions based on lesson content
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="review" className="space-y-4">
                    {currentLesson.contentType === "review" ? (
                      <div className="space-y-4">
                        <div className="p-4 border rounded-lg bg-accent/10">
                          <h3 className="font-semibold mb-2">Chapter Review Problems</h3>
                          <p className="text-sm text-muted-foreground">
                            Complete the problems from textbook {currentLesson.textbookSections}
                          </p>
                        </div>
                        <div className="border rounded-lg p-8 text-center bg-muted/20">
                          <p className="text-muted-foreground">Homework problems interface will be integrated here</p>
                          <p className="text-sm text-muted-foreground mt-2">
                            Get AI guidance on solving textbook problems
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <p>Review problems are available in the chapter review lesson.</p>
                      </div>
                    )}
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>

            {/* Bottom Navigation */}
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => previousLesson && navigate(`/platform/lesson/${previousLesson.id}`)}
                    disabled={!previousLesson}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous Lesson
                  </Button>

                  <Button onClick={handleMarkComplete} className="gap-2">
                    Mark Complete & Continue
                    {nextLesson && <ChevronRight className="h-4 w-4" />}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => nextLesson && navigate(`/platform/lesson/${nextLesson.id}`)}
                    disabled={!nextLesson}
                  >
                    Next Lesson
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default Lesson;
