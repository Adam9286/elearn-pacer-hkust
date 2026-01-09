import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { externalSupabase } from "@/lib/externalSupabase";
import { User } from "@supabase/supabase-js";
import { chapters } from "@/data/courseContent";

export interface UserProgress {
  chapter_id: number;
  lessons_completed: string[];
  quiz_score: number | null;
  quiz_passed: boolean;
}

const DEV_MODE_KEY = "learningpacer_dev_mode";

interface UserProgressContextType {
  user: User | null;
  progress: UserProgress[];
  loading: boolean;
  devMode: boolean;
  setDevMode: (enabled: boolean) => void;
  getChapterProgress: (chapterId: number) => UserProgress | undefined;
  isChapterUnlocked: (chapterId: number) => boolean;
  isSectionComplete: (chapterId: number) => boolean;
  getLessonsCompleted: (chapterId: number) => number;
  getTotalLessons: (chapterId: number) => number;
  markLessonComplete: (chapterId: number, lessonId: string) => Promise<{ success?: boolean; error?: string }>;
  refetch: () => Promise<void>;
}

const UserProgressContext = createContext<UserProgressContextType | undefined>(undefined);

export const UserProgressProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [devMode, setDevModeState] = useState(() => {
    return localStorage.getItem(DEV_MODE_KEY) === "true";
  });

  useEffect(() => {
    const { data: { subscription } } = externalSupabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    externalSupabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProgress = useCallback(async () => {
    if (!user) {
      setProgress([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const { data, error } = await externalSupabase
      .from("user_progress")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching progress:", error);
    } else {
      setProgress(data as UserProgress[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const getChapterProgress = useCallback((chapterId: number): UserProgress | undefined => {
    return progress.find(p => p.chapter_id === chapterId);
  }, [progress]);

  const isSectionComplete = useCallback((chapterId: number): boolean => {
    const chapterProgress = progress.find(p => p.chapter_id === chapterId);
    const chapter = chapters.find(c => c.id === chapterId);
    
    if (!chapter) return false;
    if (!chapterProgress) return false;
    
    const totalLessons = chapter.lessons.length;
    const completedLessons = chapterProgress.lessons_completed?.length ?? 0;
    
    return completedLessons >= totalLessons;
  }, [progress]);

  const isChapterUnlocked = useCallback((chapterId: number): boolean => {
    if (devMode) return true;
    if (chapterId === 1) return true;
    return isSectionComplete(chapterId - 1);
  }, [devMode, isSectionComplete]);

  const setDevMode = useCallback((enabled: boolean) => {
    localStorage.setItem(DEV_MODE_KEY, String(enabled));
    setDevModeState(enabled);
  }, []);

  const getLessonsCompleted = useCallback((chapterId: number): number => {
    const chapterProgress = progress.find(p => p.chapter_id === chapterId);
    return chapterProgress?.lessons_completed?.length ?? 0;
  }, [progress]);

  const getTotalLessons = useCallback((chapterId: number): number => {
    const chapter = chapters.find(c => c.id === chapterId);
    return chapter?.lessons.length ?? 0;
  }, []);

  const markLessonComplete = useCallback(async (chapterId: number, lessonId: string) => {
    if (!user) return { error: "Not authenticated" };

    const existing = progress.find(p => p.chapter_id === chapterId);
    const currentLessons = existing?.lessons_completed || [];

    if (currentLessons.includes(lessonId)) {
      return { success: true };
    }

    const updatedLessons = [...currentLessons, lessonId];

    if (existing) {
      const { error } = await externalSupabase
        .from("user_progress")
        .update({
          lessons_completed: updatedLessons,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id)
        .eq("chapter_id", chapterId);

      if (error) return { error: error.message };
    } else {
      const { error } = await externalSupabase
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
  }, [user, progress, fetchProgress]);

  const value: UserProgressContextType = {
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

  return (
    <UserProgressContext.Provider value={value}>
      {children}
    </UserProgressContext.Provider>
  );
};

export const useUserProgress = () => {
  const context = useContext(UserProgressContext);
  if (context === undefined) {
    throw new Error("useUserProgress must be used within a UserProgressProvider");
  }
  return context;
};
