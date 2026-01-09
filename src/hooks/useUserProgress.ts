import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { chapters } from "@/data/courseContent";

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

  // Check if all lessons in a chapter are completed
  const isSectionComplete = (chapterId: number): boolean => {
    const chapterProgress = progress.find(p => p.chapter_id === chapterId);
    const chapter = chapters.find(c => c.id === chapterId);
    
    if (!chapter) return false;
    if (!chapterProgress) return false;
    
    const totalLessons = chapter.lessons.length;
    const completedLessons = chapterProgress.lessons_completed?.length ?? 0;
    
    return completedLessons >= totalLessons;
  };

  const isChapterUnlocked = (chapterId: number): boolean => {
    if (devMode) return true; // Dev mode bypasses all locks
    if (chapterId === 1) return true; // Chapter 1 always unlocked
    
    // Check if previous section has all lessons completed
    return isSectionComplete(chapterId - 1);
  };

  const setDevMode = (enabled: boolean) => {
    localStorage.setItem(DEV_MODE_KEY, String(enabled));
    setDevModeState(enabled);
  };

  const getLessonsCompleted = (chapterId: number): number => {
    const chapterProgress = progress.find(p => p.chapter_id === chapterId);
    return chapterProgress?.lessons_completed?.length ?? 0;
  };

  const getTotalLessons = (chapterId: number): number => {
    const chapter = chapters.find(c => c.id === chapterId);
    return chapter?.lessons.length ?? 0;
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
    isSectionComplete,
    getLessonsCompleted,
    getTotalLessons,
    markLessonComplete,
    refetch: fetchProgress
  };
};
