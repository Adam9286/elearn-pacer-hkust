import { Lock, CheckCircle, Circle, TrendingUp } from "lucide-react";
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
    title: "Network Fundamentals",
    description: "OSI Model, TCP/IP, Network Protocols",
    progress: 100,
    locked: false,
    topics: ["OSI Model", "TCP/IP Stack", "Network Addressing"],
  },
  {
    id: 2,
    title: "Transport Layer",
    description: "TCP, UDP, Flow Control, Congestion Control",
    progress: 65,
    locked: false,
    topics: ["TCP Flow Control", "Congestion Avoidance", "UDP Protocol"],
  },
  {
    id: 3,
    title: "Network Layer",
    description: "Routing Algorithms, IP, NAT",
    progress: 0,
    locked: true,
    topics: ["Routing Protocols", "IP Addressing", "NAT & DHCP"],
  },
  {
    id: 4,
    title: "Link Layer & LANs",
    description: "Ethernet, MAC, Switching",
    progress: 0,
    locked: true,
    topics: ["Ethernet", "MAC Protocols", "VLANs"],
  },
];

const CourseMode = () => {
  return (
    <div className="space-y-6">
      {/* Course Progress Overview */}
      <Card className="glass-card shadow-lg border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Your Learning Path</CardTitle>
              <CardDescription>Complete each unit with 80% mastery to unlock the next</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">41%</div>
              <p className="text-sm text-muted-foreground">Overall Progress</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={41} className="h-3" />
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
                  <Button variant="outline" className="ml-4">
                    {unit.progress === 100 ? "Review" : "Continue"}
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
