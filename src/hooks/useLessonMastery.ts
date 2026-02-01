// useLessonMastery - Track question attempts and calculate mastery percentage
// Persists to lesson_mastery table in externalSupabase
// Students need 80% of pages answered correctly to complete a lecture
// Tracks answered pages to prevent double-credit

import { useState, useEffect, useCallback } from "react";
import { externalSupabase } from "@/lib/externalSupabase";

interface LessonMasteryState {
  questionsTotal: number;       // Total pages in lecture
  questionsAnswered: number;    // How many pages user has attempted
  questionsCorrect: number;     // How many pages user got right
  pagesAnswered: number[];      // Which page numbers have been answered
  pagesCorrect: number[];       // Which page numbers were answered correctly
  isComplete: boolean;          // Whether 80% threshold was reached
  isLoading: boolean;
  error: string | null;
}

interface UseLessonMasteryReturn extends LessonMasteryState {
  accuracy: number;             // Percentage (0-100) - kept for reference
  requiredCorrect: number;      // How many correct needed (ceil(total * 0.8))
  hasPassed: boolean;           // questionsCorrect >= requiredCorrect
  hasAnsweredPage: (pageNumber: number) => boolean;
  wasPageCorrect: (pageNumber: number) => boolean;
  recordAnswer: (pageNumber: number, isCorrect: boolean, isRetry: boolean) => Promise<void>;
  setTotalQuestions: (total: number) => void;
}

const MASTERY_THRESHOLD = 80; // 80% of pages must be answered correctly

export function useLessonMastery(
  lessonId: string, 
  userId: string | undefined
): UseLessonMasteryReturn {
  const [state, setState] = useState<LessonMasteryState>({
    questionsTotal: 0,
    questionsAnswered: 0,
    questionsCorrect: 0,
    pagesAnswered: [],
    pagesCorrect: [],
    isComplete: false,
    isLoading: true,
    error: null,
  });

  // Calculate accuracy percentage (kept for reference)
  const accuracy = state.questionsAnswered > 0
    ? Math.round((state.questionsCorrect / state.questionsAnswered) * 100)
    : 0;

  // Count-based mastery: need 80% of total pages answered correctly
  const requiredCorrect = Math.ceil(state.questionsTotal * (MASTERY_THRESHOLD / 100));
  const hasPassed = state.questionsCorrect >= requiredCorrect && requiredCorrect > 0;

  // Check if a specific page has already been answered
  const hasAnsweredPage = useCallback((pageNumber: number) => {
    return state.pagesAnswered.includes(pageNumber);
  }, [state.pagesAnswered]);

  // Check if a specific page was answered correctly
  const wasPageCorrect = useCallback((pageNumber: number) => {
    return state.pagesCorrect.includes(pageNumber);
  }, [state.pagesCorrect]);

  // Fetch existing mastery record on mount
  useEffect(() => {
    if (!userId || !lessonId) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const fetchMastery = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await externalSupabase
        .from("lesson_mastery")
        .select("*")
        .eq("user_id", userId)
        .eq("lesson_id", lessonId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching lesson mastery:", error);
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: error.message 
        }));
        return;
      }

      if (data) {
        const total = data.questions_total || 0;
        // Validate and cap counts to prevent impossible states like "4/1"
        const validAnswered = Math.min(data.questions_answered || 0, total || Infinity);
        const validCorrect = Math.min(data.questions_correct || 0, validAnswered);
        const validPagesAnswered = (data.pages_answered || []).filter((p: number) => p <= (total || Infinity));
        const validPagesCorrect = (data.pages_correct || []).filter((p: number) => validPagesAnswered.includes(p));
        
        setState({
          questionsTotal: total,
          questionsAnswered: validAnswered,
          questionsCorrect: validCorrect,
          pagesAnswered: validPagesAnswered,
          pagesCorrect: validPagesCorrect,
          isComplete: data.is_complete || false,
          isLoading: false,
          error: null,
        });
      } else {
        // No record exists yet - that's fine, we'll create one on first answer
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchMastery();
  }, [userId, lessonId]);

  // Set total questions and sync to database if different
  const setTotalQuestions = useCallback(async (total: number) => {
    setState(prev => {
      // Cap existing counts at new total to fix stale data
      const validAnswered = Math.min(prev.questionsAnswered, total);
      const validCorrect = Math.min(prev.questionsCorrect, validAnswered);
      return { 
        ...prev, 
        questionsTotal: total,
        questionsAnswered: validAnswered,
        questionsCorrect: validCorrect,
      };
    });
    
    // If we have a user, sync the corrected total to database
    if (userId && lessonId && total > 0) {
      const { error } = await externalSupabase
        .from("lesson_mastery")
        .upsert({
          user_id: userId,
          lesson_id: lessonId,
          questions_total: total,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,lesson_id'
        });
      
      if (error) {
        console.error("Error syncing questions_total:", error);
      } else {
        console.log('[Mastery] Synced questions_total to', total);
      }
    }
  }, [userId, lessonId]);

  // Record a question answer with page tracking
  const recordAnswer = useCallback(async (
    pageNumber: number, 
    isCorrect: boolean, 
    isRetry: boolean
  ) => {
    if (!userId || !lessonId) {
      console.warn("Cannot record answer: no user or lesson ID");
      return;
    }

    const alreadyAnswered = state.pagesAnswered.includes(pageNumber);
    const alreadyCorrect = state.pagesCorrect.includes(pageNumber);

    // If already answered correctly, no changes allowed (prevent double-credit)
    if (alreadyCorrect) {
      console.log(`Page ${pageNumber} already answered correctly, no change`);
      return;
    }

    // Calculate new state
    let newPagesAnswered = [...state.pagesAnswered];
    let newPagesCorrect = [...state.pagesCorrect];
    let newAnswered = state.questionsAnswered;
    let newCorrect = state.questionsCorrect;

    if (!alreadyAnswered) {
      // First attempt on this page
      newPagesAnswered = [...state.pagesAnswered, pageNumber];
      newAnswered = state.questionsAnswered + 1;
      if (isCorrect) {
        newPagesCorrect = [...state.pagesCorrect, pageNumber];
        newCorrect = state.questionsCorrect + 1;
      }
    } else if (isRetry && isCorrect) {
      // Retry on a page that was previously wrong - now correct!
      newPagesCorrect = [...state.pagesCorrect, pageNumber];
      newCorrect = state.questionsCorrect + 1;
    }
    // If isRetry and still wrong, no change

    const required = Math.ceil(state.questionsTotal * (MASTERY_THRESHOLD / 100));
    const willPass = newCorrect >= required && required > 0;

    // Optimistic update
    setState(prev => ({
      ...prev,
      questionsAnswered: newAnswered,
      questionsCorrect: newCorrect,
      pagesAnswered: newPagesAnswered,
      pagesCorrect: newPagesCorrect,
      isComplete: prev.isComplete || willPass,
    }));

    // Upsert to database
    const { error } = await externalSupabase
      .from("lesson_mastery")
      .upsert({
        user_id: userId,
        lesson_id: lessonId,
        questions_total: state.questionsTotal,
        questions_answered: newAnswered,
        questions_correct: newCorrect,
        pages_answered: newPagesAnswered,
        pages_correct: newPagesCorrect,
        is_complete: state.isComplete || willPass,
        completed_at: willPass && !state.isComplete ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,lesson_id'
      });

    if (error) {
      console.error("Error saving lesson mastery:", error);
      // Revert optimistic update on error
      setState(prev => ({
        ...prev,
        questionsAnswered: state.questionsAnswered,
        questionsCorrect: state.questionsCorrect,
        pagesAnswered: state.pagesAnswered,
        pagesCorrect: state.pagesCorrect,
        error: error.message,
      }));
    }
  }, [userId, lessonId, state]);

  return {
    ...state,
    accuracy,
    requiredCorrect,
    hasPassed,
    hasAnsweredPage,
    wasPageCorrect,
    recordAnswer,
    setTotalQuestions,
  };
}

export { MASTERY_THRESHOLD };
