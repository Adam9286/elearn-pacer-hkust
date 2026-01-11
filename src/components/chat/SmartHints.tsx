import { useState } from 'react';
import { 
  Lightbulb, 
  BookOpen, 
  Target, 
  Zap, 
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { chapters } from '@/data/courseContent';
import { cn } from '@/lib/utils';

interface SmartHintsProps {
  onQuestionClick: (question: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

type StudyMode = 'quick' | 'deep' | 'exam' | 'problem';

const STUDY_MODES: { value: StudyMode; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    value: 'quick', 
    label: 'Quick Review', 
    icon: <Zap className="w-4 h-4" />,
    description: 'Get concise summaries'
  },
  { 
    value: 'deep', 
    label: 'Deep Dive', 
    icon: <BookOpen className="w-4 h-4" />,
    description: 'Detailed explanations with examples'
  },
  { 
    value: 'exam', 
    label: 'Exam Prep', 
    icon: <Target className="w-4 h-4" />,
    description: 'Focus on likely exam topics'
  },
  { 
    value: 'problem', 
    label: 'Problem Solving', 
    icon: <GraduationCap className="w-4 h-4" />,
    description: 'Step-by-step calculations'
  },
];

const QUICK_QUESTIONS = [
  { label: 'Explain topic', template: 'Explain [topic] like I\'m a beginner' },
  { label: 'Compare', template: 'What are the key differences between [A] and [B]?' },
  { label: 'Practice', template: 'Give me a practice problem about [topic]' },
  { label: 'Summarize', template: 'Summarize the main concepts of [chapter/topic]' },
];

// Get key topics from course content
const KEY_TOPICS = [
  { name: 'TCP', query: 'TCP protocol and flow control' },
  { name: 'BGP', query: 'BGP routing and path selection' },
  { name: 'DNS', query: 'DNS resolution process' },
  { name: 'CDN', query: 'Content Delivery Networks' },
  { name: 'Security', query: 'Network security fundamentals' },
  { name: 'Congestion', query: 'Congestion control mechanisms' },
  { name: 'IP', query: 'IP addressing and fragmentation' },
  { name: 'Wireless', query: 'Wireless network protocols' },
];

export const SmartHints = ({ 
  onQuestionClick,
  isCollapsed = false,
  onToggleCollapse,
}: SmartHintsProps) => {
  const [studyMode, setStudyMode] = useState<StudyMode>('quick');
  const [showAllTopics, setShowAllTopics] = useState(false);

  const getModePrefix = () => {
    switch (studyMode) {
      case 'quick':
        return 'Give me a quick, concise answer: ';
      case 'deep':
        return 'Explain in detail with examples: ';
      case 'exam':
        return 'Help me prepare for an exam on: ';
      case 'problem':
        return 'Guide me step-by-step through: ';
      default:
        return '';
    }
  };

  const handleTopicClick = (topic: { name: string; query: string }) => {
    onQuestionClick(`${getModePrefix()}${topic.query}`);
  };

  const handleQuickQuestionClick = (template: string) => {
    onQuestionClick(template);
  };

  const currentMode = STUDY_MODES.find(m => m.value === studyMode);
  const displayedTopics = showAllTopics ? KEY_TOPICS : KEY_TOPICS.slice(0, 6);

  if (isCollapsed) {
    return (
      <div className="mx-4 mt-4">
        <Button
          variant="outline"
          className="w-full justify-between"
          onClick={onToggleCollapse}
        >
          <span className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            Smart Hints
          </span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="glass-card shadow-lg mx-4 mt-4">
      <CardHeader className="border-b bg-gradient-to-r from-primary/80 to-accent/70 py-3">
        <CardTitle className="flex items-center justify-between text-lg text-white">
          <span className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-accent animate-float" />
            Smart Hints
          </span>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="h-6 w-6 p-0 text-white hover:bg-white/20"
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Study Mode Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            Study Mode
          </label>
          <Select value={studyMode} onValueChange={(v) => setStudyMode(v as StudyMode)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                <span className="flex items-center gap-2">
                  {currentMode?.icon}
                  {currentMode?.label}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STUDY_MODES.map((mode) => (
                <SelectItem key={mode.value} value={mode.value}>
                  <div className="flex items-center gap-2">
                    {mode.icon}
                    <div>
                      <div className="font-medium">{mode.label}</div>
                      <div className="text-xs text-muted-foreground">{mode.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quick Question Templates */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Quick Questions</label>
          <div className="flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map((q, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="text-xs hover:bg-primary/10 hover:border-primary/30"
                onClick={() => handleQuickQuestionClick(q.template)}
              >
                {q.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Topic Quick Links */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Course Topics</label>
          <div className="flex flex-wrap gap-2">
            {displayedTopics.map((topic, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className={cn(
                  "cursor-pointer transition-all hover:bg-primary/20 hover:border-primary/30",
                  "px-3 py-1.5 text-xs"
                )}
                onClick={() => handleTopicClick(topic)}
              >
                {topic.name}
              </Badge>
            ))}
            {KEY_TOPICS.length > 6 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => setShowAllTopics(!showAllTopics)}
              >
                {showAllTopics ? 'Show less' : `+${KEY_TOPICS.length - 6} more`}
              </Button>
            )}
          </div>
        </div>

        {/* Section Quick Access */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Ask About Section</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {chapters.slice(0, 8).map((chapter) => (
              <Button
                key={chapter.id}
                variant="outline"
                size="sm"
                className="text-xs h-auto py-2 px-2 text-left justify-start whitespace-normal"
                onClick={() => onQuestionClick(`${getModePrefix()}Section ${chapter.id}: ${chapter.title}`)}
              >
                <span className="line-clamp-2">
                  {chapter.id}. {chapter.title.split(' ').slice(0, 3).join(' ')}...
                </span>
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
