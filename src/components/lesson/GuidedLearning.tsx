// GuidedLearning - Main orchestrator for slide-by-slide learning
// currentSlide is the single source of truth for all dependent UI
// Uses explicit contentState for deterministic loading behavior

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import type { Lesson, Chapter } from "@/data/courseContent";
import { findLesson } from "@/data/courseContent";
import type { CourseSlide, SlideExplanationResponse } from "@/types/courseTypes";
import {
  fetchSlideExplanation,
  fetchActualSlideCount,
  estimateTotalSlides,
  shouldGenerateQuestion,
} from "@/services/courseApi";
import { useLessonMastery } from "@/hooks/useLessonMastery";
import { useUserProgress } from "@/contexts/UserProgressContext";
import PdfViewer from "./PdfViewer";
import ExplanationPanel from "./ExplanationPanel";
import CompactProgress from "./CompactProgress";
import SlideChat from "./SlideChat";
import TestYourselfCard from "./TestYourselfCard";

interface GuidedLearningProps {
  lesson: Lesson;
  chapter: Chapter;
  onComplete?: () => void;
}

const GuidedLearning = ({ lesson, chapter, onComplete }: GuidedLearningProps) => {
  const { user } = useUserProgress();

  const [totalPages, setTotalPages] = useState(() =>
    estimateTotalSlides(lesson.estimatedMinutes)
  );

  useEffect(() => {
    async function loadActualCount() {
      const actualCount = await fetchActualSlideCount(lesson.id);
      if (actualCount && actualCount > 0) {
        console.log("[GuidedLearning] Using actual slide count:", actualCount);
        setTotalPages(actualCount);
      }
    }
    loadActualCount();
  }, [lesson.id]);

  const lectureId = useMemo(() => {
    const found = findLesson(lesson.id);
    return found?.lesson.lectureFile || undefined;
  }, [lesson.id]);

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

  const [currentPage, setCurrentPage] = useState(1);

  const [slides, setSlides] = useState<CourseSlide[]>(() =>
    Array.from({ length: totalPages }, (_, i) => ({
      slideNumber: i + 1,
      status: i === 0 ? "unlocked" : "locked",
      contentState: "idle",
    }))
  );

  const [previousContext, setPreviousContext] = useState<string>("");
  const [questionsEnabled] = useState(true);

  const slideMap = useMemo(
    () => Object.fromEntries(slides.map((s) => [s.slideNumber, s])),
    [slides]
  );

  const currentSlideData = slideMap[currentPage];

  useEffect(() => {
    if (totalPages > 0) {
      setTotalQuestions(totalPages);
    }
  }, [totalPages, setTotalQuestions]);

  const isCurrentPageLoading = currentSlideData?.contentState === "loading";
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages && !isCurrentPageLoading;

  const fetchExplanationForPage = useCallback(
    async (pageNum: number) => {
      setSlides((prev) =>
        prev.map((slide) =>
          slide.slideNumber === pageNum
            ? { ...slide, contentState: "loading" as const }
            : slide
        )
      );

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

        setSlides((prev) =>
          prev.map((slide) => {
            if (slide.slideNumber === pageNum) {
              return {
                ...slide,
                contentState: "ready" as const,
                explanation: response.explanation,
                keyPoints: response.keyPoints,
                comprehensionQuestion: response.comprehensionQuestion,
              };
            }
            if (slide.slideNumber === pageNum + 1 && slide.status === "locked") {
              return { ...slide, status: "unlocked" as const };
            }
            return slide;
          })
        );

        if (response.keyPoints?.length > 0) {
          setPreviousContext((prev) =>
            `${prev} Page ${pageNum}: ${response.keyPoints.join(". ")}.`.slice(-1000)
          );
        }

      } catch (err) {
        console.error("Error fetching page explanation:", err);
        const message = err instanceof Error ? err.message : "Failed to load explanation";

        setSlides((prev) =>
          prev.map((slide) =>
            slide.slideNumber === pageNum
              ? {
                  ...slide,
                  contentState: "error" as const,
                  errorMessage: message,
                }
              : slide
          )
        );

        if (message.includes("Rate limit")) {
          toast.error("Rate limit exceeded. Please wait a moment before continuing.");
        } else if (message.includes("credits")) {
          toast.error("AI credits depleted. Please add credits to continue learning.");
        }
      }
    },
    [lesson, chapter, totalPages, previousContext, questionsEnabled]
  );

  useEffect(() => {
    if (currentSlideData?.contentState === "idle") {
      fetchExplanationForPage(currentPage);
    }
  }, [currentPage, currentSlideData?.contentState, fetchExplanationForPage]);

  const handlePreviousPage = useCallback(() => {
    if (canGoPrevious) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [canGoPrevious]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setSlides((prev) =>
        prev.map((slide) =>
          slide.slideNumber === currentPage
            ? { ...slide, status: "completed" as const }
            : slide
        )
      );
      setCurrentPage((prev) => prev + 1);
    } else {
      toast.success("You've completed all slides for this lesson.");
      onComplete?.();
    }
  }, [currentPage, totalPages, onComplete]);

  const handlePageJump = useCallback(
    (targetPage: number) => {
      if (targetPage >= 1 && targetPage <= totalPages && targetPage !== currentPage) {
        if (targetPage > currentPage) {
          setSlides((prev) =>
            prev.map((slide) =>
              slide.slideNumber === currentPage
                ? { ...slide, status: "completed" as const }
                : slide
            )
          );
        }
        setCurrentPage(targetPage);
      }
    },
    [currentPage, totalPages]
  );

  const handleQuestionAnswer = useCallback(
    async (correct: boolean, isRetry = false) => {
      await recordAnswer(currentPage, correct, isRetry);
    },
    [recordAnswer, currentPage]
  );

  const handleRetry = useCallback(() => {
    setSlides((prev) =>
      prev.map((slide) =>
        slide.slideNumber === currentPage
          ? { ...slide, contentState: "idle" as const, errorMessage: undefined }
          : slide
      )
    );
  }, [currentPage]);

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.08),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] shadow-[0_24px_80px_rgba(2,8,23,0.38)] backdrop-blur-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
          <section className="border-b border-white/6 p-4 md:p-5 xl:p-6 lg:border-b-0 lg:border-r">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  Lecture Slides
                </div>
                <p className="text-sm text-muted-foreground">
                  Read the deck on the left. The AI Tutor on the right explains the same slide.
                </p>
              </div>
              <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-sm font-medium text-foreground/90">
                Slide {currentPage} of {totalPages}
              </div>
            </div>

            {lesson.pdfUrl && (
              <PdfViewer
                pdfUrl={lesson.pdfUrl}
                currentPage={currentPage}
                totalPages={totalPages}
                title={lesson.title}
              />
            )}
          </section>

          <section className="flex flex-col gap-4 p-4 md:p-5 xl:p-6">
            <ExplanationPanel
              slideNumber={currentPage}
              totalSlides={totalPages}
              contentState={currentSlideData?.contentState ?? "idle"}
              explanation={currentSlideData?.explanation}
              keyPoints={currentSlideData?.keyPoints}
              errorMessage={currentSlideData?.errorMessage}
              onRetry={handleRetry}
              onPrevious={handlePreviousPage}
              onNext={handleNextPage}
              onSlideJump={handlePageJump}
              canGoNext={canGoNext}
              canGoPrevious={canGoPrevious}
              isLoading={isCurrentPageLoading}
            />

            <SlideChat
              lessonId={lesson.id}
              lessonTitle={lesson.title}
              slideNumber={currentPage}
              slideContext={currentSlideData?.explanation}
              keyPoints={currentSlideData?.keyPoints}
              chapterTitle={chapter.title}
              textbookSections={lesson.textbookSections}
              lectureId={lectureId}
            />

            {currentSlideData?.comprehensionQuestion && (
              <TestYourselfCard
                question={currentSlideData.comprehensionQuestion}
                pageNumber={currentPage}
                hasBeenAnswered={hasAnsweredPage(currentPage)}
                previouslyCorrect={wasPageCorrect(currentPage)}
                onAnswer={handleQuestionAnswer}
              />
            )}
          </section>
        </div>
      </div>

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
