import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export interface UserProgress {
  chapter_id: number;
  lessons_completed: string[];
  quiz_score: number | null;
  quiz_passed: boolean;
}

const DEV_MODE_KEY = "learningpacer_dev_mode";

export const useUserProgress = () => {
  const [user, setUser] = useState<User | null>(null);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [devMode, setDevModeState] = useState(() => {
    return localStorage.getItem(DEV_MODE_KEY) === "true";
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchProgress();
    } else {
      setProgress([]);
      setLoading(false);
    }
  }, [user]);

  const fetchProgress = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching progress:", error);
    } else {
      setProgress(data as UserProgress[]);
    }
    setLoading(false);
  };

  const getChapterProgress = (chapterId: number): UserProgress | undefined => {
    return progress.find(p => p.chapter_id === chapterId);
  };

  const isChapterUnlocked = (chapterId: number): boolean => {
    if (devMode) return true; // Dev mode bypasses all locks
    if (chapterId === 1) return true; // Chapter 1 always unlocked
    
    const previousChapter = progress.find(p => p.chapter_id === chapterId - 1);
    return previousChapter?.quiz_passed ?? false;
  };

  const setDevMode = (enabled: boolean) => {
    localStorage.setItem(DEV_MODE_KEY, String(enabled));
    setDevModeState(enabled);
  };

  const updateQuizScore = async (chapterId: number, score: number, totalQuestions: number) => {
    if (!user) return { error: "Not authenticated" };

    const percentage = Math.round((score / totalQuestions) * 100);
    const passed = percentage >= 80;

    // Check if record exists
    const existing = progress.find(p => p.chapter_id === chapterId);

    if (existing) {
      const { error } = await supabase
        .from("user_progress")
        .update({
          quiz_score: percentage,
          quiz_passed: passed,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id)
        .eq("chapter_id", chapterId);

      if (error) return { error: error.message };
    } else {
      const { error } = await supabase
        .from("user_progress")
        .insert({
          user_id: user.id,
          chapter_id: chapterId,
          quiz_score: percentage,
          quiz_passed: passed,
          lessons_completed: []
        });

      if (error) return { error: error.message };
    }

    // Record quiz attempt
    await supabase.from("quiz_attempts").insert({
      user_id: user.id,
      chapter_id: chapterId,
      score: percentage,
      total_questions: totalQuestions
    });

    await fetchProgress();
    return { passed, percentage };
  };

  const markLessonComplete = async (chapterId: number, lessonId: string) => {
    if (!user) return { error: "Not authenticated" };

    const existing = progress.find(p => p.chapter_id === chapterId);
    const currentLessons = existing?.lessons_completed || [];

    if (currentLessons.includes(lessonId)) {
      return { success: true }; // Already completed
    }

    const updatedLessons = [...currentLessons, lessonId];

    if (existing) {
      const { error } = await supabase
        .from("user_progress")
        .update({
          lessons_completed: updatedLessons,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id)
        .eq("chapter_id", chapterId);

      if (error) return { error: error.message };
    } else {
      const { error } = await supabase
        .from("user_progress")
        .insert({
          user_id: user.id,
          chapter_id: chapterId,
          lessons_completed: updatedLessons,
          quiz_passed: false
        });

      if (error) return { error: error.message };
    }

    await fetchProgress();
    return { success: true };
  };

  return {
    user,
    progress,
    loading,
    devMode,
    setDevMode,
    getChapterProgress,
    isChapterUnlocked,
    updateQuizScore,
    markLessonComplete,
    refetch: fetchProgress
  };
};
