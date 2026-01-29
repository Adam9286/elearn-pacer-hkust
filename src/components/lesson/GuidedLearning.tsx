// GuidedLearning - Main orchestrator for slide-by-slide learning
// currentSlide is the single source of truth for all dependent UI
// Uses explicit contentState for deterministic loading behavior

import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Lesson, Chapter } from "@/data/courseContent";
import { findLesson } from "@/data/courseContent";
import type { CourseSlide, SlideExplanationResponse } from "@/types/courseTypes";
import { 
  fetchSlideExplanation, 
  estimateTotalSlides, 
  shouldGenerateQuestion 
} from "@/services/courseApi";

// Sub-components
import PdfViewer from "./PdfViewer";
import ExplanationPanel from "./ExplanationPanel";
import SlideNavigation from "./SlideNavigation";
import SlideProgressTracker from "./SlideProgressTracker";
import SlideChat from "./SlideChat";
import ComprehensionCheck, { type ComprehensionQuestion } from "./ComprehensionCheck";

interface GuidedLearningProps {
  lesson: Lesson;
  chapter: Chapter;
  onComplete?: () => void;
}

const GuidedLearning = ({ lesson, chapter, onComplete }: GuidedLearningProps) => {
  // Calculate total slides from lesson duration
  const totalSlides = useMemo(
    () => estimateTotalSlides(lesson.estimatedMinutes), 
    [lesson.estimatedMinutes]
  );
  
  // Get lectureId for slide chat
  const lectureId = useMemo(() => {
    const found = findLesson(lesson.id);
    return found?.lesson.lectureFile || undefined;
  }, [lesson.id]);
  
  // ============ Core State ============
  // currentSlide is the SINGLE SOURCE OF TRUTH
  const [currentSlide, setCurrentSlide] = useState(1);
  
  // Slide data array - each slide has explicit contentState
  const [slides, setSlides] = useState<CourseSlide[]>(() => 
    Array.from({ length: totalSlides }, (_, i) => ({
      slideNumber: i + 1,
      status: i === 0 ? 'unlocked' : 'locked',
      contentState: 'idle',  // Explicit: not yet fetched
    }))
  );
  
  // ============ Context for AI ============
  const [previousContext, setPreviousContext] = useState<string>("");
  
  // ============ Questions State ============
  const [questionsEnabled, setQuestionsEnabled] = useState(true);
  const [questionsMode] = useState<'blocking' | 'dismissible'>('dismissible');
  const [questionsShown, setQuestionsShown] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [questionsCorrect, setQuestionsCorrect] = useState(0);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<ComprehensionQuestion | null>(null);
  
  // ============ Slide Lookup Map ============
  // Use slideNumber as key for safe lookup (not array index)
  const slideMap = useMemo(
    () => Object.fromEntries(slides.map(s => [s.slideNumber, s])),
    [slides]
  );
  
  // Current slide data via map lookup (authoritative)
  const currentSlideData = slideMap[currentSlide];
  
  // ============ Derived State ============
  const slidesViewed = useMemo(
    () => slides
      .filter(s => s.status === 'completed' || s.status === 'unlocked')
      .map(s => s.slideNumber),
    [slides]
  );
  
  // Navigation control based on contentState
  const isCurrentSlideLoading = currentSlideData?.contentState === 'loading';
  const canGoPrevious = currentSlide > 1;
  const canGoNext = currentSlide < totalSlides && !isCurrentSlideLoading;
  
  // ============ API Call ============
  const fetchExplanationForSlide = useCallback(async (slideNum: number) => {
    // Set loading state for this specific slide
    setSlides(prev => prev.map(slide => 
      slide.slideNumber === slideNum 
        ? { ...slide, contentState: 'loading' as const }
        : slide
    ));

    try {
      const generateQuestion = questionsEnabled && shouldGenerateQuestion(slideNum);
      
      const response: SlideExplanationResponse = await fetchSlideExplanation({
        lessonId: lesson.id,
        slideNumber: slideNum,
        totalSlides,
        lessonTitle: lesson.title,
        chapterTitle: chapter.title,
        chapterTopics: chapter.topics,
        textbookSections: lesson.textbookSections,
        previousContext: previousContext.slice(-500),
        generateQuestion,
        pdfUrl: lesson.pdfUrl,
      });
      
      // Set ready state with content for this slide
      setSlides(prev => prev.map(slide => {
        if (slide.slideNumber === slideNum) {
          return {
            ...slide,
            contentState: 'ready' as const,
            explanation: response.explanation,
            keyPoints: response.keyPoints,
            comprehensionQuestion: response.comprehensionQuestion,
          };
        }
        // Unlock next slide
        if (slide.slideNumber === slideNum + 1 && slide.status === 'locked') {
          return { ...slide, status: 'unlocked' as const };
        }
        return slide;
      }));
      
      // Update context for next slide
      if (response.keyPoints?.length > 0) {
        setPreviousContext(prev => 
          `${prev} Slide ${slideNum}: ${response.keyPoints.join('. ')}.`.slice(-1000)
        );
      }

      // Show comprehension question if generated
      if (response.comprehensionQuestion) {
        setQuestionsShown(prev => prev + 1);
        setCurrentQuestion(response.comprehensionQuestion);
        setTimeout(() => setShowQuestionDialog(true), 500);
      }

    } catch (err) {
      console.error('Error fetching slide explanation:', err);
      const message = err instanceof Error ? err.message : 'Failed to load explanation';
      
      // Set error state for this specific slide
      setSlides(prev => prev.map(slide => 
        slide.slideNumber === slideNum 
          ? { ...slide, contentState: 'error' as const, errorMessage: message }
          : slide
      ));
      
      if (message.includes('Rate limit')) {
        toast.error('Rate limit exceeded. Please wait a moment before continuing.');
      } else if (message.includes('credits')) {
        toast.error('AI credits depleted. Please add credits to continue learning.');
      }
    }
  }, [lesson, chapter, totalSlides, previousContext, questionsEnabled]);

  // ============ Effects ============
  // Fetch explanation when slide changes - only if contentState is 'idle'
  useEffect(() => {
    if (currentSlideData?.contentState === 'idle') {
      fetchExplanationForSlide(currentSlide);
    }
  }, [currentSlide, currentSlideData?.contentState, fetchExplanationForSlide]);

  // ============ Navigation Handlers ============
  const handlePreviousSlide = useCallback(() => {
    if (canGoPrevious) {
      setCurrentSlide(prev => prev - 1);
    }
  }, [canGoPrevious]);

  const handleNextSlide = useCallback(() => {
    if (currentSlide < totalSlides) {
      // Mark current slide as completed
      setSlides(prev => prev.map(slide => 
        slide.slideNumber === currentSlide 
          ? { ...slide, status: 'completed' as const }
          : slide
      ));
      setCurrentSlide(prev => prev + 1);
    } else {
      // Completed all slides
      toast.success("You've completed all sections for this lesson!");
      onComplete?.();
    }
  }, [currentSlide, totalSlides, onComplete]);

  const handleSkipToEnd = useCallback(() => {
    setCurrentSlide(totalSlides);
  }, [totalSlides]);

  // ============ Question Handlers ============
  const handleQuestionAnswer = useCallback((correct: boolean) => {
    setQuestionsAnswered(prev => prev + 1);
    if (correct) {
      setQuestionsCorrect(prev => prev + 1);
    }
    setCurrentQuestion(null);
  }, []);

  const handleQuestionSkip = useCallback(() => {
    setCurrentQuestion(null);
  }, []);

  // Retry resets contentState to 'idle', triggering re-fetch
  const handleRetry = useCallback(() => {
    setSlides(prev => prev.map(slide => 
      slide.slideNumber === currentSlide 
        ? { ...slide, contentState: 'idle' as const, errorMessage: undefined }
        : slide
    ));
  }, [currentSlide]);

  // ============ Render ============
  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <SlideNavigation
        currentSlide={currentSlide}
        totalSlides={totalSlides}
        onPrevious={handlePreviousSlide}
        onNext={handleNextSlide}
        onSkipToEnd={handleSkipToEnd}
        canGoNext={canGoNext}
        canGoPrevious={canGoPrevious}
        isLoading={isCurrentSlideLoading}
        questionsEnabled={questionsEnabled}
        onQuestionsToggle={setQuestionsEnabled}
      />

      {/* PDF Viewer - Abstracted */}
      {lesson.pdfUrl && (
        <PdfViewer
          pdfUrl={lesson.pdfUrl}
          currentPage={currentSlide}
          totalPages={totalSlides}
          title={lesson.title}
        />
      )}

      {/* AI Explanation Panel - uses explicit contentState */}
      <ExplanationPanel
        slideNumber={currentSlide}
        contentState={currentSlideData?.contentState ?? 'idle'}
        explanation={currentSlideData?.explanation}
        keyPoints={currentSlideData?.keyPoints}
        errorMessage={currentSlideData?.errorMessage}
        onRetry={handleRetry}
      />

      {/* Follow-up Chat */}
      <SlideChat
        lessonId={lesson.id}
        lessonTitle={lesson.title}
        slideNumber={currentSlide}
        slideContext={currentSlideData?.explanation}
        lectureId={lectureId}
      />

      {/* Progress Tracker */}
      <SlideProgressTracker
        currentSlide={currentSlide}
        totalSlides={totalSlides}
        slidesViewed={slidesViewed}
        questionsShown={questionsShown}
        questionsAnswered={questionsAnswered}
        questionsCorrect={questionsCorrect}
      />

      {/* Bottom Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={handlePreviousSlide}
          disabled={!canGoPrevious || isCurrentSlideLoading}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous Section
        </Button>
        <Button 
          onClick={handleNextSlide} 
          disabled={isCurrentSlideLoading}
        >
          {currentSlide === totalSlides ? 'Complete Lesson' : 'Next Section'}
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
          mode={questionsMode}
          questionsEnabled={questionsEnabled}
          onQuestionsToggle={setQuestionsEnabled}
        />
      )}
    </div>
  );
};

export default GuidedLearning;
