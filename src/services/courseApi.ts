// Centralized API for Course Mode
// Queries pre-generated explanations from slide_explanations table
// Falls back to n8n real-time generation if not found

import type { 
  SlideExplanationRequest, 
  SlideExplanationResponse 
} from '@/types/courseTypes';
import { examSupabase } from '@/lib/examSupabase';
import { findLesson } from '@/data/courseContent';
import { WEBHOOKS, TIMEOUTS } from '@/constants/api';

// Feature flag - set to true to always use n8n (skip pre-generated)
const FORCE_REALTIME_GENERATION = false;

/**
 * Map frontend lessonId to database lecture_id
 * Uses the lectureFile property from courseContent.ts
 */
function getLectureId(lessonId: string): string | null {
  const found = findLesson(lessonId);
  return found?.lesson.lectureFile || null;
}

/**
 * Fallback to n8n real-time generation
 * Used when pre-generated content is not available
 */
async function fallbackToRealTimeGeneration(
  request: SlideExplanationRequest
): Promise<SlideExplanationResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUTS.SLIDE_EXPLANATION);

  try {
    const response = await fetch(WEBHOOKS.COURSE_SLIDE_EXPLAIN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonId: request.lessonId,
        slideNumber: request.slideNumber,
        totalSlides: request.totalSlides,
        lessonTitle: request.lessonTitle,
        chapterTitle: request.chapterTitle,
        chapterTopics: request.chapterTopics,
        textbookSections: request.textbookSections,
        previousContext: request.previousContext,
        generateQuestion: request.generateQuestion,
        pdfUrl: request.pdfUrl,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch explanation (${response.status})`);
    }

    const data = await response.json();
    
    return {
      explanation: data.explanation || '',
      keyPoints: Array.isArray(data.keyPoints) 
        ? data.keyPoints 
        : JSON.parse(data.keyPoints || '[]'),
      comprehensionQuestion: data.comprehensionQuestion || undefined,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw err;
  }
}

/**
 * Fetch explanation for a specific slide
 * First checks for pre-generated content, falls back to n8n if not found
 */
export async function fetchSlideExplanation(
  request: SlideExplanationRequest
): Promise<SlideExplanationResponse> {
  // Skip pre-generated and always use real-time if flag is set
  if (FORCE_REALTIME_GENERATION) {
    console.log('[CourseAPI] Force realtime generation enabled');
    return fallbackToRealTimeGeneration(request);
  }

  const lectureId = getLectureId(request.lessonId);
  
  if (!lectureId) {
    console.warn('[CourseAPI] No lectureFile mapping for lessonId:', request.lessonId);
    return fallbackToRealTimeGeneration(request);
  }

  console.log('[CourseAPI] Looking up pre-generated explanation:', { 
    lectureId, 
    slideNumber: request.slideNumber 
  });

  // Query pre-generated explanation from examSupabase (only approved content)
  const { data, error } = await examSupabase
    .from('slide_explanations')
    .select('explanation, key_points, comprehension_question')
    .eq('lecture_id', lectureId)
    .eq('slide_number', request.slideNumber)
    .eq('status', 'approved')
    .maybeSingle();

  if (error) {
    console.error('[CourseAPI] Database error:', error);
    return fallbackToRealTimeGeneration(request);
  }

  if (!data) {
    console.log('[CourseAPI] No pre-generated content found, falling back to n8n');
    return fallbackToRealTimeGeneration(request);
  }

  console.log('[CourseAPI] Found pre-generated explanation');

  // Return pre-generated content
  return {
    explanation: data.explanation,
    keyPoints: data.key_points as string[],
    comprehensionQuestion: data.comprehension_question as SlideExplanationResponse['comprehensionQuestion'] || undefined,
  };
}

/**
 * Estimate total slides based on lesson duration
 * Roughly 1 slide per 2-3 minutes of content
 */
export function estimateTotalSlides(estimatedMinutes: number): number {
  return Math.max(5, Math.ceil(estimatedMinutes / 2.5));
}

/**
 * Placeholder for future PDF metadata fetching
 */
export async function fetchPdfPageCount(pdfUrl: string): Promise<number> {
  console.log('fetchPdfPageCount called with:', pdfUrl);
  return 10;
}

/**
 * Determine if a comprehension question should be generated
 */
export function shouldGenerateQuestion(
  slideNumber: number, 
  questionInterval: number = 4
): boolean {
  return slideNumber > 1 && slideNumber % questionInterval === 0;
}
