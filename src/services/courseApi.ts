// Centralized API for Course Mode
// All slide explanations and course-related API calls go through here
// This makes it easy to swap backends (edge function → n8n OCR workflow)

import type { 
  SlideExplanationRequest, 
  SlideExplanationResponse 
} from '@/types/courseTypes';

// Configuration for API calls
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Future: n8n OCR workflow endpoint
// const N8N_OCR_ENDPOINT = 'https://your-n8n-instance/webhook/slide-explainer';

/**
 * Fetch AI-generated explanation for a specific slide
 * Currently uses Lovable Cloud edge function
 * Future: Will switch to n8n OCR workflow
 */
export async function fetchSlideExplanation(
  request: SlideExplanationRequest
): Promise<SlideExplanationResponse> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/explain-slide`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
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
        // pdfUrl: request.pdfUrl, // Uncomment when n8n OCR is ready
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch explanation (${response.status})`);
  }

  return response.json();
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
 * Will be used when n8n OCR workflow is ready
 */
export async function fetchPdfPageCount(pdfUrl: string): Promise<number> {
  // TODO: Implement when n8n backend is ready
  // For now, return a placeholder value
  console.log('fetchPdfPageCount called with:', pdfUrl);
  return 10; // Placeholder
}

/**
 * Determine if a comprehension question should be generated
 * Based on slide interval (every N slides)
 */
export function shouldGenerateQuestion(
  slideNumber: number, 
  questionInterval: number = 4
): boolean {
  return slideNumber > 1 && slideNumber % questionInterval === 0;
}
