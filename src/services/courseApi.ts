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

// Feature flag for mock mode - set to false for real backend
const USE_MOCK_BACKEND = true;

// Future: n8n OCR workflow endpoint
// const N8N_OCR_ENDPOINT = 'https://your-n8n-instance/webhook/slide-explainer';

/**
 * Mock implementation - simulates network latency and returns test data
 * Used for frontend development and testing without real backend
 */
async function mockSlideExplanation(
  request: SlideExplanationRequest
): Promise<SlideExplanationResponse> {
  // Simulate 400-800ms network delay
  await new Promise(r => setTimeout(r, 400 + Math.random() * 400));

  return {
    explanation: `This is section ${request.slideNumber} of "${request.lessonTitle}". ` +
      `This slide covers key concepts from ${request.chapterTitle} relevant to ELEC3120. ` +
      `The content builds on previous sections and prepares you for upcoming material. ` +
      `Understanding these fundamentals is essential for the exam.`,
    keyPoints: [
      `Key concept ${request.slideNumber}: Core networking principle`,
      `Protocol behavior discussed in this section`,
      `Exam-relevant detail for ${request.chapterTitle}`,
    ],
    comprehensionQuestion: request.generateQuestion
      ? {
          question: `What is the main takeaway from section ${request.slideNumber}?`,
          options: [
            'The correct answer for this question',
            'A plausible but incorrect option',
            'Another distractor option',
            'An obviously wrong choice',
          ],
          correctIndex: 0,
          explanation: 'Option A correctly summarizes the key concept from this section.',
        }
      : undefined,
  };
}

/**
 * Fetch AI-generated explanation for a specific slide
 * Currently uses mock backend for development
 * Future: Will switch to n8n OCR workflow
 */
export async function fetchSlideExplanation(
  request: SlideExplanationRequest
): Promise<SlideExplanationResponse> {
  // Use mock backend for development
  if (USE_MOCK_BACKEND) {
    return mockSlideExplanation(request);
  }

  // Real API call (used when USE_MOCK_BACKEND = false)
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
