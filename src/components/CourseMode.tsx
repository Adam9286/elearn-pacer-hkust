import { Lock, CheckCircle, Circle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Unit {
  id: number;
  title: string;
  description: string;
  progress: number;
  locked: boolean;
  topics: string[];
}

const units: Unit[] = [
  {
    id: 1,
    title: "Computer Networks and the Internet",
    description: "Introduction, Web Basics, Video Streaming",
    progress: 0,
    locked: false,
    topics: ["Network Fundamentals", "Web & HTTP", "Video Streaming", "Chapter Review"],
  },
  {
    id: 2,
    title: "Application Layer",
    description: "Network Applications, Web, HTTP",
    progress: 0,
    locked: true,
    topics: ["Application Principles", "Web & HTTP", "Chapter Review"],
  },
  {
    id: 3,
    title: "Transport Layer",
    description: "TCP, UDP, Flow Control, Congestion Control",
    progress: 0,
    locked: true,
    topics: ["Transport Model", "TCP Basics", "Congestion Control", "Queue Management", "Chapter Review"],
  },
  {
    id: 4,
    title: "Network Layer - Data Plane",
    description: "IP Fundamentals, Routing",
    progress: 0,
    locked: true,
    topics: ["IP Fundamentals", "Chapter Review"],
  },
  {
    id: 5,
    title: "Network Layer - Control Plane",
    description: "BGP, Internet Structure",
    progress: 0,
    locked: true,
    topics: ["BGP Introduction", "BGP Advanced", "Internet Structure", "Chapter Review"],
  },
  {
    id: 6,
    title: "Link Layer and LANs",
    description: "Ethernet, MAC, Switching",
    progress: 0,
    locked: true,
    topics: ["Local Area Networks", "LAN Routing", "Link Layer Challenge", "Chapter Review"],
  },
  {
    id: 7,
    title: "Wireless and Mobile Networks",
    description: "Wireless Communication, Mobile Networks",
    progress: 0,
    locked: true,
    topics: ["Wireless Networks", "Chapter Review"],
  },
  {
    id: 8,
    title: "Security and Advanced Topics",
    description: "CDN, Datacenter, Security, Real-Time Video",
    progress: 0,
    locked: true,
    topics: ["CDN", "Datacenter", "Security Fundamentals", "Advanced Security", "Real-Time Video"],
  },
];

const CourseMode = () => {
  const navigate = useNavigate();

  const handleUnitClick = (unit: Unit) => {
    if (!unit.locked) {
      // Navigate to first lesson of the chapter
      navigate(`/platform/lesson/${unit.id}-1`);
    }
  };

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
              <div className="text-3xl font-bold text-primary">0%</div>
              <p className="text-sm text-muted-foreground">Overall Progress</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={0} className="h-3" />
        </CardContent>
      </Card>

      {/* Units */}
      <div className="grid gap-6">
        {units.map((unit) => (
          <Card
            key={unit.id}
            className={`transition-smooth glass-card ${
              unit.locked
                ? "opacity-60 cursor-not-allowed"
                : "hover:shadow-glow cursor-pointer"
            }`}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {unit.progress === 100 ? (
                      <CheckCircle className="w-6 h-6 text-accent" />
                    ) : unit.locked ? (
                      <Lock className="w-6 h-6 text-muted-foreground" />
                    ) : (
                      <Circle className="w-6 h-6 text-primary" />
                    )}
                    <CardTitle className="text-xl">{unit.title}</CardTitle>
                  </div>
                  <CardDescription>{unit.description}</CardDescription>
                </div>
                {!unit.locked && (
                  <Button variant="outline" className="ml-4" onClick={() => handleUnitClick(unit)}>
                    {unit.progress === 100 ? "Review" : unit.progress === 0 ? "Start" : "Continue"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm font-bold text-primary">{unit.progress}%</span>
                </div>
                <Progress value={unit.progress} className="h-2" />
              </div>
              <div className="flex flex-wrap gap-2">
                {unit.topics.map((topic, idx) => (
                  <Badge
                    key={idx}
                    variant={unit.locked ? "outline" : "secondary"}
                    className="transition-smooth"
                  >
                    {topic}
                  </Badge>
                ))}
              </div>
              {unit.locked && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                  <Lock className="w-4 h-4" />
                  <span>Achieve 80% mastery in previous unit to unlock</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CourseMode;
