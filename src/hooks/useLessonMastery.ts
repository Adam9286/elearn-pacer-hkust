// useLessonMastery - Track question attempts and calculate mastery percentage
// Persists to lesson_mastery table in externalSupabase
// Students need 80% accuracy to complete a lecture

import { useState, useEffect, useCallback } from "react";
import { externalSupabase } from "@/lib/externalSupabase";

interface LessonMasteryState {
  questionsTotal: number;       // Total questions available in lecture
  questionsAnswered: number;    // How many user has attempted
  questionsCorrect: number;     // How many user got right
  isComplete: boolean;          // Whether 80% threshold was reached
  isLoading: boolean;
  error: string | null;
}

interface UseLessonMasteryReturn extends LessonMasteryState {
  accuracy: number;             // Percentage (0-100) - kept for reference
  requiredCorrect: number;      // How many correct needed (ceil(total * 0.8))
  hasPassed: boolean;           // questionsCorrect >= requiredCorrect
  recordAnswer: (isCorrect: boolean) => Promise<void>;
  setTotalQuestions: (total: number) => void;
}

const MASTERY_THRESHOLD = 80; // 80% accuracy required

export function useLessonMastery(
  lessonId: string, 
  userId: string | undefined
): UseLessonMasteryReturn {
  const [state, setState] = useState<LessonMasteryState>({
    questionsTotal: 0,
    questionsAnswered: 0,
    questionsCorrect: 0,
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
        setState({
          questionsTotal: data.questions_total || 0,
          questionsAnswered: data.questions_answered || 0,
          questionsCorrect: data.questions_correct || 0,
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

  // Set total questions (called when slides are loaded)
  const setTotalQuestions = useCallback((total: number) => {
    setState(prev => ({ ...prev, questionsTotal: total }));
  }, []);

  // Record a question answer
  const recordAnswer = useCallback(async (isCorrect: boolean) => {
    if (!userId || !lessonId) {
      console.warn("Cannot record answer: no user or lesson ID");
      return;
    }

    // Optimistic update
    const newAnswered = state.questionsAnswered + 1;
    const newCorrect = state.questionsCorrect + (isCorrect ? 1 : 0);
    const required = Math.ceil(state.questionsTotal * (MASTERY_THRESHOLD / 100));
    const willPass = newCorrect >= required && required > 0;

    setState(prev => ({
      ...prev,
      questionsAnswered: newAnswered,
      questionsCorrect: newCorrect,
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
        questionsAnswered: prev.questionsAnswered - 1,
        questionsCorrect: prev.questionsCorrect - (isCorrect ? 1 : 0),
        error: error.message,
      }));
    }
  }, [userId, lessonId, state.questionsAnswered, state.questionsCorrect, state.questionsTotal, state.isComplete]);

  return {
    ...state,
    accuracy,
    requiredCorrect,
    hasPassed,
    recordAnswer,
    setTotalQuestions,
  };
}

export { MASTERY_THRESHOLD };
