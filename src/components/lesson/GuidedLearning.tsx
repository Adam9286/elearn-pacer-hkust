// GuidedLearning - Main orchestrator for page-by-page learning
// currentSlide is the single source of truth for all dependent UI
// Uses explicit contentState for deterministic loading behavior
// REDESIGNED: Side-by-side layout, user-controlled questions, Page terminology
// Progress tracking: Questions answered are tracked for progress display only

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import type { Lesson, Chapter } from "@/data/courseContent";
import { findLesson } from "@/data/courseContent";
import type { CourseSlide, SlideExplanationResponse } from "@/types/courseTypes";
import { 
  fetchSlideExplanation, 
  fetchActualSlideCount,
  estimateTotalSlides, 
  shouldGenerateQuestion 
} from "@/services/courseApi";
import { useLessonMastery } from "@/hooks/useLessonMastery";
import { useUserProgress } from "@/contexts/UserProgressContext";

// Sub-components
import PdfViewer from "./PdfViewer";
import ExplanationPanel from "./ExplanationPanel";
import PageNavigation from "./PageNavigation";
import CompactProgress from "./CompactProgress";
import SlideChat from "./SlideChat";
import TestYourselfCard from "./TestYourselfCard";

interface GuidedLearningProps {
  lesson: Lesson;
  chapter: Chapter;
  onComplete?: () => void;
}

const GuidedLearning = ({ lesson, chapter, onComplete }: GuidedLearningProps) => {
  // Get user and progress context
  const { user, markLessonComplete } = useUserProgress();
  
  // State for actual page count - starts with estimate, updates from DB
  const [totalPages, setTotalPages] = useState(() => 
    estimateTotalSlides(lesson.estimatedMinutes)
  );
  
  // Fetch actual slide count from database on mount
  useEffect(() => {
    async function loadActualCount() {
      const actualCount = await fetchActualSlideCount(lesson.id);
      if (actualCount && actualCount > 0) {
        console.log('[GuidedLearning] Using actual slide count:', actualCount);
        setTotalPages(actualCount);
      }
    }
    loadActualCount();
  }, [lesson.id]);
  
  // Get lectureId for slide chat
  const lectureId = useMemo(() => {
    const found = findLesson(lesson.id);
    return found?.lesson.lectureFile || undefined;
  }, [lesson.id]);
  
  // ============ Mastery Tracking (for progress display only) ============
  const {
    questionsAnswered: masteryAnswered,
    questionsCorrect: masteryCorrect,
    requiredCorrect,
    hasPassed,
    hasAnsweredPage,
    wasPageCorrect,
    recordAnswer,
    setTotalQuestions,
  } = useLessonMastery(lesson.id, user?.id);
  
  
  // ============ Core State ============
  // currentPage is the SINGLE SOURCE OF TRUTH
  const [currentPage, setCurrentPage] = useState(1);
  
  // Slide data array - each slide has explicit contentState
  const [slides, setSlides] = useState<CourseSlide[]>(() => 
    Array.from({ length: totalPages }, (_, i) => ({
      slideNumber: i + 1,
      status: i === 0 ? 'unlocked' : 'locked',
      contentState: 'idle',  // Explicit: not yet fetched
    }))
  );
  
  // ============ Context for AI ============
  const [previousContext, setPreviousContext] = useState<string>("");
  
  // ============ Questions State (local session tracking) ============
  const [questionsEnabled] = useState(true);
  const [questionsShown, setQuestionsShown] = useState(0);
  
  // ============ Slide Lookup Map ============
  // Use slideNumber as key for safe lookup (not array index)
  const slideMap = useMemo(
    () => Object.fromEntries(slides.map(s => [s.slideNumber, s])),
    [slides]
  );
  
  // Current slide data via map lookup (authoritative)
  const currentSlideData = slideMap[currentPage];
  
  // Update mastery hook with total pages (not questions)
  // Students need 80% of pages answered correctly
  useEffect(() => {
    if (totalPages > 0) {
      setTotalQuestions(totalPages);
    }
  }, [totalPages, setTotalQuestions]);
  
  // ============ Derived State ============
  const slidesViewed = useMemo(
    () => slides
      .filter(s => s.status === 'completed' || s.status === 'unlocked')
      .map(s => s.slideNumber),
    [slides]
  );
  
  // Navigation control based on contentState
  const isCurrentPageLoading = currentSlideData?.contentState === 'loading';
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages && !isCurrentPageLoading;
  
  // ============ API Call ============
  const fetchExplanationForPage = useCallback(async (pageNum: number) => {
    // Set loading state for this specific page
    setSlides(prev => prev.map(slide => 
      slide.slideNumber === pageNum 
        ? { ...slide, contentState: 'loading' as const }
        : slide
    ));

    try {
      const generateQuestion = questionsEnabled && shouldGenerateQuestion(pageNum);
      
      const response: SlideExplanationResponse = await fetchSlideExplanation({
        lessonId: lesson.id,
        slideNumber: pageNum,
        totalSlides: totalPages,
        lessonTitle: lesson.title,
        chapterTitle: chapter.title,
        chapterTopics: chapter.topics,
        textbookSections: lesson.textbookSections,
        previousContext: previousContext.slice(-500),
        generateQuestion,
        pdfUrl: lesson.pdfUrl,
      });
      
      // Set ready state with content for this page
      setSlides(prev => prev.map(slide => {
        if (slide.slideNumber === pageNum) {
          return {
            ...slide,
            contentState: 'ready' as const,
            explanation: response.explanation,
            keyPoints: response.keyPoints,
            comprehensionQuestion: response.comprehensionQuestion,
          };
        }
        // Unlock next page
        if (slide.slideNumber === pageNum + 1 && slide.status === 'locked') {
          return { ...slide, status: 'unlocked' as const };
        }
        return slide;
      }));
      
      // Update context for next page
      if (response.keyPoints?.length > 0) {
        setPreviousContext(prev => 
          `${prev} Page ${pageNum}: ${response.keyPoints.join('. ')}.`.slice(-1000)
        );
      }

      // Track question if generated (no auto-popup)
      if (response.comprehensionQuestion) {
        setQuestionsShown(prev => prev + 1);
      }

    } catch (err) {
      console.error('Error fetching page explanation:', err);
      const message = err instanceof Error ? err.message : 'Failed to load explanation';
      
      // Set error state for this specific page
      setSlides(prev => prev.map(slide => 
        slide.slideNumber === pageNum 
          ? { ...slide, contentState: 'error' as const, errorMessage: message }
          : slide
      ));
      
      if (message.includes('Rate limit')) {
        toast.error('Rate limit exceeded. Please wait a moment before continuing.');
      } else if (message.includes('credits')) {
        toast.error('AI credits depleted. Please add credits to continue learning.');
      }
    }
  }, [lesson, chapter, totalPages, previousContext, questionsEnabled]);

  // ============ Effects ============
  // Fetch explanation when page changes - only if contentState is 'idle'
  useEffect(() => {
    if (currentSlideData?.contentState === 'idle') {
      fetchExplanationForPage(currentPage);
    }
  }, [currentPage, currentSlideData?.contentState, fetchExplanationForPage]);

  // ============ Navigation Handlers ============
  const handlePreviousPage = useCallback(() => {
    if (canGoPrevious) {
      setCurrentPage(prev => prev - 1);
    }
  }, [canGoPrevious]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      // Mark current page as completed
      setSlides(prev => prev.map(slide => 
        slide.slideNumber === currentPage 
          ? { ...slide, status: 'completed' as const }
          : slide
      ));
      setCurrentPage(prev => prev + 1);
    } else {
      // Completed all pages
      toast.success("You've completed all pages for this lesson!");
      onComplete?.();
    }
  }, [currentPage, totalPages, onComplete]);

  // ============ Page Jump Handler ============
  const handlePageJump = useCallback((targetPage: number) => {
    if (targetPage >= 1 && targetPage <= totalPages && targetPage !== currentPage) {
      // Mark current page as completed if moving forward
      if (targetPage > currentPage) {
        setSlides(prev => prev.map(slide => 
          slide.slideNumber === currentPage 
            ? { ...slide, status: 'completed' as const }
            : slide
        ));
      }
      setCurrentPage(targetPage);
    }
  }, [currentPage, totalPages]);

  // ============ Question Handler ============
  const handleQuestionAnswer = useCallback(async (correct: boolean, isRetry: boolean = false) => {
    // Record to database via mastery hook with page tracking (for progress tracking only)
    await recordAnswer(currentPage, correct, isRetry);
    
    // No automatic completion - users can mark lessons complete manually via the "Mark complete" button
  }, [recordAnswer, currentPage]);

  // Retry resets contentState to 'idle', triggering re-fetch
  const handleRetry = useCallback(() => {
    setSlides(prev => prev.map(slide => 
      slide.slideNumber === currentPage 
        ? { ...slide, contentState: 'idle' as const, errorMessage: undefined }
        : slide
    ));
  }, [currentPage]);

  // ============ Render ============
  return (
    <div className="space-y-4">
      {/* Top Navigation - Clean page indicator */}
      <PageNavigation
        currentPage={currentPage}
        totalPages={totalPages}
        onPrevious={handlePreviousPage}
        onNext={handleNextPage}
        onPageJump={handlePageJump}
        canGoNext={canGoNext}
        canGoPrevious={canGoPrevious}
        isLoading={isCurrentPageLoading}
      />

      {/* Main Content - Side by Side on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6">
        {/* Left: PDF Viewer (sticky on desktop) */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          {lesson.pdfUrl && (
            <PdfViewer
              pdfUrl={lesson.pdfUrl}
              currentPage={currentPage}
              totalPages={totalPages}
              title={lesson.title}
            />
          )}
        </div>

        {/* Right: Learning Content Stack */}
        <div className="space-y-4">
          {/* AI Explanation Panel */}
          <ExplanationPanel
            slideNumber={currentPage}
            contentState={currentSlideData?.contentState ?? 'idle'}
            explanation={currentSlideData?.explanation}
            keyPoints={currentSlideData?.keyPoints}
            errorMessage={currentSlideData?.errorMessage}
            onRetry={handleRetry}
          />

          {/* Compact Chat - Always visible input */}
          <SlideChat
            lessonId={lesson.id}
            lessonTitle={lesson.title}
            slideNumber={currentPage}
            slideContext={currentSlideData?.explanation}
            lectureId={lectureId}
          />

          {/* Test Yourself - User-controlled, inline */}
          {currentSlideData?.comprehensionQuestion && (
            <TestYourselfCard
              question={currentSlideData.comprehensionQuestion}
              pageNumber={currentPage}
              hasBeenAnswered={hasAnsweredPage(currentPage)}
              previouslyCorrect={wasPageCorrect(currentPage)}
              onAnswer={handleQuestionAnswer}
            />
          )}
        </div>
      </div>

      {/* Compact Progress Bar with Mastery */}
      <CompactProgress
        currentPage={currentPage}
        totalPages={totalPages}
        questionsAnswered={masteryAnswered}
        questionsCorrect={masteryCorrect}
        requiredCorrect={requiredCorrect}
        hasPassed={hasPassed}
      />
    </div>
  );
};

export default GuidedLearning;
