import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Sparkles, Loader2, AlertCircle, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import SlideProgress from "./SlideProgress";
import ComprehensionCheck, { ComprehensionQuestion } from "./ComprehensionCheck";
import { toast } from "sonner";
import type { Lesson, Chapter } from "@/data/courseContent";

interface GuidedLearningProps {
  lesson: Lesson;
  chapter: Chapter;
  onComplete?: () => void;
}

interface SlideExplanation {
  explanation: string;
  keyPoints: string[];
  comprehensionQuestion?: ComprehensionQuestion;
}

// Estimate total slides based on lesson duration (roughly 1 slide per 2-3 minutes)
const estimateTotalSlides = (estimatedMinutes: number): number => {
  return Math.max(5, Math.ceil(estimatedMinutes / 2.5));
};

const GuidedLearning = ({ lesson, chapter, onComplete }: GuidedLearningProps) => {
  const totalSlides = estimateTotalSlides(lesson.estimatedMinutes);
  
  const [currentSlide, setCurrentSlide] = useState(1);
  const [explanation, setExplanation] = useState<SlideExplanation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previousContext, setPreviousContext] = useState<string>("");
  
  // Comprehension tracking
  const [questionsEnabled, setQuestionsEnabled] = useState(true);
  const [questionsShown, setQuestionsShown] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [questionsCorrect, setQuestionsCorrect] = useState(0);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<ComprehensionQuestion | null>(null);

  // Determine if we should show a question (every 3-5 slides)
  const shouldGenerateQuestion = useCallback((slideNum: number): boolean => {
    // Show question every 4 slides on average
    const questionInterval = 4;
    return slideNum > 1 && slideNum % questionInterval === 0;
  }, []);

  // Build PDF URL with page number for synchronization
  const pdfUrlWithPage = lesson.pdfUrl 
    ? `${lesson.pdfUrl.replace(/#.*$/, '')}#page=${currentSlide}` 
    : null;

  const fetchExplanation = useCallback(async (slideNum: number) => {
    setIsLoading(true);
    setError(null);
    setExplanation(null);

    try {
      const generateQuestion = questionsEnabled && shouldGenerateQuestion(slideNum);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/explain-slide`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            lessonId: lesson.id,
            slideNumber: slideNum,
            totalSlides,
            lessonTitle: lesson.title,
            chapterTitle: chapter.title,
            chapterTopics: chapter.topics,
            textbookSections: lesson.textbookSections,
            previousContext: previousContext.slice(-500), // Keep context short
            generateQuestion,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch explanation (${response.status})`);
      }

      const data: SlideExplanation = await response.json();
      setExplanation(data);
      
      // Update context for next slide
      if (data.keyPoints?.length > 0) {
        setPreviousContext(prev => 
          `${prev} Slide ${slideNum}: ${data.keyPoints.join('. ')}.`.slice(-1000)
        );
      }

      // Show comprehension question if generated
      if (data.comprehensionQuestion) {
        setQuestionsShown(prev => prev + 1);
        setCurrentQuestion(data.comprehensionQuestion);
        // Small delay before showing question
        setTimeout(() => setShowQuestionDialog(true), 500);
      }

    } catch (err) {
      console.error('Error fetching slide explanation:', err);
      const message = err instanceof Error ? err.message : 'Failed to load explanation';
      setError(message);
      
      if (message.includes('Rate limit')) {
        toast.error('Rate limit exceeded. Please wait a moment before continuing.');
      } else if (message.includes('credits')) {
        toast.error('AI credits depleted. Please add credits to continue learning.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [lesson, chapter, totalSlides, previousContext, shouldGenerateQuestion, questionsEnabled]);

  // Fetch explanation when slide changes
  useEffect(() => {
    fetchExplanation(currentSlide);
  }, [currentSlide]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePreviousSlide = () => {
    if (currentSlide > 1) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleNextSlide = () => {
    if (currentSlide < totalSlides) {
      setCurrentSlide(prev => prev + 1);
    } else {
      // Completed all slides
      toast.success('You\'ve completed all slides for this lesson!');
      onComplete?.();
    }
  };

  const handleQuestionAnswer = (correct: boolean) => {
    setQuestionsAnswered(prev => prev + 1);
    if (correct) {
      setQuestionsCorrect(prev => prev + 1);
    }
    setCurrentQuestion(null);
  };

  const handleQuestionSkip = () => {
    setCurrentQuestion(null);
  };

  const handleSkipToEnd = () => {
    setCurrentSlide(totalSlides);
  };

  return (
    <div className="space-y-6">
      {/* Slide Navigation Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePreviousSlide}
            disabled={currentSlide === 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-3">
            Slide {currentSlide} of {totalSlides}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextSlide}
            disabled={isLoading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch 
              id="questions-toggle"
              checked={questionsEnabled}
              onCheckedChange={setQuestionsEnabled}
            />
            <Label htmlFor="questions-toggle" className="text-sm cursor-pointer">
              Questions
            </Label>
          </div>
          
          <Button variant="ghost" size="sm" onClick={handleSkipToEnd} disabled={isLoading}>
            <SkipForward className="mr-2 h-4 w-4" />
            Skip to End
          </Button>
        </div>
      </div>

      {/* PDF Viewer - synchronized with current slide */}
      {pdfUrlWithPage && (
        <div className="aspect-video rounded-lg overflow-hidden border bg-muted">
          <iframe
            key={currentSlide}
            src={pdfUrlWithPage}
            className="w-full h-full"
            title={`${lesson.title} - Slide ${currentSlide}`}
            allow="autoplay"
          />
        </div>
      )}

      {/* AI Explanation Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold text-primary">AI Tutor</span>
            <Badge variant="secondary" className="text-xs">
              Slide {currentSlide}
            </Badge>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[90%]" />
              <Skeleton className="h-4 w-[80%]" />
              <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating explanation...
              </div>
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 text-destructive">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <div>
                <p className="font-medium">Failed to load explanation</p>
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => fetchExplanation(currentSlide)}
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : explanation ? (
            <div className="space-y-4">
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                {explanation.explanation}
              </p>

              {explanation.keyPoints && explanation.keyPoints.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                    Key Points
                  </h4>
                  <ul className="space-y-1.5">
                    {explanation.keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-bold">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Progress Tracker */}
      <Card>
        <CardContent className="pt-6">
          <SlideProgress
            currentSlide={currentSlide}
            totalSlides={totalSlides}
            questionsAnswered={questionsAnswered}
            questionsCorrect={questionsCorrect}
            questionsShown={questionsShown}
          />
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={handlePreviousSlide}
          disabled={currentSlide === 1 || isLoading}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous Slide
        </Button>
        <Button onClick={handleNextSlide} disabled={isLoading}>
          {currentSlide === totalSlides ? 'Complete Lesson' : 'Next Slide'}
          {currentSlide < totalSlides && <ChevronRight className="ml-2 h-4 w-4" />}
        </Button>
      </div>

      {/* Comprehension Check Dialog */}
      {currentQuestion && (
        <ComprehensionCheck
          open={showQuestionDialog}
          onOpenChange={setShowQuestionDialog}
          question={currentQuestion}
          onAnswer={handleQuestionAnswer}
          onSkip={handleQuestionSkip}
        />
      )}
    </div>
  );
};

export default GuidedLearning;
