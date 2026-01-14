// Course Mode Data Model
// This file defines the frontend data structures for the slide-by-slide learning experience

// Slide status for navigation control
export type SlideStatus = 'locked' | 'unlocked' | 'completed';

// Explicit content state (replaces ambiguous undefined checks)
export type ContentState = 'idle' | 'loading' | 'ready' | 'error';

// Comprehension question structure (matches backend response)
export interface ComprehensionQuestion {
  question: string;
  options: string[];        // Exactly 4 options
  selectedIndex?: number;   // User's selection
  correctIndex: number;     // Correct answer index
  explanation: string;      // Explanation for the answer
}

// Individual slide data
export interface CourseSlide {
  slideNumber: number;
  status: SlideStatus;
  contentState: ContentState;     // Explicit loading state
  explanation?: string;           // AI-generated (undefined = not loaded)
  keyPoints?: string[];           // AI-generated
  errorMessage?: string;          // Per-slide error message
  comprehensionQuestion?: ComprehensionQuestion;
}

// Lesson state for the guided learning session
export interface GuidedLessonState {
  lessonId: string;
  currentSlide: number;           // Single source of truth
  totalSlides: number;
  slides: CourseSlide[];          // Indexed by slideNumber - 1
  questionsEnabled: boolean;
  questionsMode: 'blocking' | 'dismissible';
}

// API request/response types
export interface SlideExplanationRequest {
  lessonId: string;
  slideNumber: number;
  totalSlides: number;
  lessonTitle: string;
  chapterTitle: string;
  chapterTopics: string[];
  textbookSections?: string;
  previousContext?: string;
  generateQuestion: boolean;
  pdfUrl?: string;  // For future OCR integration
}

export interface SlideExplanationResponse {
  explanation: string;
  keyPoints: string[];
  comprehensionQuestion?: ComprehensionQuestion;
}

// Progress tracking
export interface SlideProgressStats {
  currentSlide: number;
  totalSlides: number;
  slidesViewed: number[];
  questionsShown: number;
  questionsAnswered: number;
  questionsCorrect: number;
}
