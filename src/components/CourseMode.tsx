import { Lock, CheckCircle, Circle, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUserProgress } from "@/hooks/useUserProgress";
import { Skeleton } from "@/components/ui/skeleton";

interface Unit {
  id: number;
  title: string;
  description: string;
  topics: string[];
}

const units: Unit[] = [
  {
    id: 1,
    title: "Computer Networks and the Internet",
    description: "Introduction, Web Basics, Video Streaming",
    topics: ["Network Fundamentals", "Web & HTTP", "Video Streaming", "Chapter Review"],
  },
  {
    id: 2,
    title: "Application Layer",
    description: "Network Applications, Web, HTTP",
    topics: ["Application Principles", "Web & HTTP", "Chapter Review"],
  },
  {
    id: 3,
    title: "Transport Layer",
    description: "TCP, UDP, Flow Control, Congestion Control",
    topics: ["Transport Model", "TCP Basics", "Congestion Control", "Queue Management", "Chapter Review"],
  },
  {
    id: 4,
    title: "Network Layer - Data Plane",
    description: "IP Fundamentals, Routing",
    topics: ["IP Fundamentals", "Chapter Review"],
  },
  {
    id: 5,
    title: "Network Layer - Control Plane",
    description: "BGP, Internet Structure",
    topics: ["BGP Introduction", "BGP Advanced", "Internet Structure", "Chapter Review"],
  },
  {
    id: 6,
    title: "Link Layer and LANs",
    description: "Ethernet, MAC, Switching",
    topics: ["Local Area Networks", "LAN Routing", "Link Layer Challenge", "Chapter Review"],
  },
  {
    id: 7,
    title: "Wireless and Mobile Networks",
    description: "Wireless Communication, Mobile Networks",
    topics: ["Wireless Networks", "Chapter Review"],
  },
  {
    id: 8,
    title: "Security and Advanced Topics",
    description: "CDN, Datacenter, Security, Real-Time Video",
    topics: ["CDN", "Datacenter", "Security Fundamentals", "Advanced Security", "Real-Time Video"],
  },
];

const CourseMode = () => {
  const navigate = useNavigate();
  const { user, loading, getChapterProgress, isChapterUnlocked } = useUserProgress();

  const handleUnitClick = (unit: Unit) => {
    if (isChapterUnlocked(unit.id)) {
      navigate(`/platform/lesson/${unit.id}-1`);
    }
  };

  const getUnitProgress = (unitId: number) => {
    const progress = getChapterProgress(unitId);
    return progress?.quiz_score ?? 0;
  };

  const isUnitComplete = (unitId: number) => {
    const progress = getChapterProgress(unitId);
    return progress?.quiz_passed ?? false;
  };

  // Calculate overall progress
  const completedChapters = units.filter(u => isUnitComplete(u.id)).length;
  const overallProgress = Math.round((completedChapters / units.length) * 100);

  if (!user) {
    return (
      <Card className="glass-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign In Required</CardTitle>
          <CardDescription>
            Create an account to track your learning progress and unlock chapters
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
      {/* Course Progress Overview */}
      <Card className="glass-card shadow-lg border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Your Learning Path</CardTitle>
              <CardDescription>Complete each chapter with 80% mastery to unlock the next</CardDescription>
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
            {completedChapters} of {units.length} chapters completed
          </p>
        </CardContent>
      </Card>

      {/* Units */}
      <div className="grid gap-6">
        {units.map((unit) => {
          const unlocked = isChapterUnlocked(unit.id);
          const complete = isUnitComplete(unit.id);
          const progress = getUnitProgress(unit.id);

          return (
            <Card
              key={unit.id}
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
                      <CardTitle className="text-xl">{unit.title}</CardTitle>
                      {complete && (
                        <Badge variant="default" className="bg-green-500">
                          {progress}% ✓
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{unit.description}</CardDescription>
                  </div>
                  {unlocked && (
                    <Button variant="outline" className="ml-4" onClick={() => handleUnitClick(unit)}>
                      {complete ? "Review" : progress > 0 ? "Continue" : "Start"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Quiz Score</span>
                    <span className="text-sm font-bold text-primary">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {unit.topics.map((topic, idx) => (
                    <Badge
                      key={idx}
                      variant={!unlocked ? "outline" : "secondary"}
                      className="transition-smooth"
                    >
                      {topic}
                    </Badge>
                  ))}
                </div>
                {!unlocked && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                    <Lock className="w-4 h-4" />
                    <span>Score 80%+ on Chapter {unit.id - 1} quiz to unlock</span>
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
