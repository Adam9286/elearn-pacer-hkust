import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { toast } from "sonner";
import { externalSupabase } from "@/lib/externalSupabase";
import { User } from "@supabase/supabase-js";
import { chapters } from "@/data/courseContent";
import {
  getDisplayNameFromEmail,
  refreshMyRankSnapshot,
} from "@/services/rankService";
import { getRankForLevel, type RankId, type UserRankSnapshot } from "@/utils/rankSystem";

export interface UserProgress {
  chapter_id: number;
  lessons_completed: string[];
  quiz_score: number | null;
  quiz_passed: boolean;
}

export interface RankUpEvent {
  rankId: RankId;
  rankName: string;
  level: number;
  triggeredAt: number;
}

const DEV_MODE_KEY = "learningpacer_dev_mode";

interface UserProgressContextType {
  user: User | null;
  progress: UserProgress[];
  loading: boolean;
  authResolved: boolean;
  rankSnapshot: UserRankSnapshot | null;
  rankLoading: boolean;
  rankUpEvent: RankUpEvent | null;
  dismissRankUp: () => void;
  devMode: boolean;
  isAdmin: boolean;
  adminLoading: boolean;
  setDevMode: (enabled: boolean) => void;
  getChapterProgress: (chapterId: number) => UserProgress | undefined;
  isChapterUnlocked: (chapterId: number) => boolean;
  isSectionComplete: (chapterId: number) => boolean;
  getLessonsCompleted: (chapterId: number) => number;
  getTotalLessons: (chapterId: number) => number;
  markLessonComplete: (chapterId: number, lessonId: string) => Promise<{ success?: boolean; error?: string }>;
  markLessonIncomplete: (chapterId: number, lessonId: string) => Promise<{ success?: boolean; error?: string }>;
  refreshRank: () => Promise<UserRankSnapshot | null>;
  refetch: () => Promise<void>;
}

const UserProgressContext = createContext<UserProgressContextType | undefined>(undefined);

export const UserProgressProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [authResolved, setAuthResolved] = useState(false);
  const [rankSnapshot, setRankSnapshot] = useState<UserRankSnapshot | null>(null);
  const [rankLoading, setRankLoading] = useState(false);
  const previousLevelRef = useRef<number | null>(null);
  const [rankUpEvent, setRankUpEvent] = useState<RankUpEvent | null>(null);

  const dismissRankUp = useCallback(() => {
    setRankUpEvent(null);
  }, []);

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [devMode, setDevModeState] = useState(() => {
    return localStorage.getItem(DEV_MODE_KEY) === "true";
  });

  // Check if user has admin role
  const checkAdminRole = useCallback(async (userId: string) => {
    setAdminLoading(true);
    const { data, error } = await externalSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single();
    
    setIsAdmin(!error && data !== null);
    setAdminLoading(false);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = externalSupabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setAuthResolved(true);
      if (session?.user) {
        setTimeout(() => checkAdminRole(session.user.id), 0);
      } else {
        setIsAdmin(false);
        setAdminLoading(false);
        setRankSnapshot(null);
        setDevModeState(false);
        previousLevelRef.current = null;
        setRankUpEvent(null);
      }
    });

    externalSupabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthResolved(true);
      if (session?.user) {
        checkAdminRole(session.user.id);
      } else {
        setAdminLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkAdminRole]);

  const refreshRank = useCallback(async () => {
    if (!user) {
      setRankSnapshot(null);
      setRankLoading(false);
      previousLevelRef.current = null;
      return null;
    }

    setRankLoading(true);
    try {
      const snapshot = await refreshMyRankSnapshot(
        user.id,
        getDisplayNameFromEmail(user.email),
      );

      const previousLevel = previousLevelRef.current;
      const newLevel = snapshot.level;

      if (previousLevel !== null && newLevel > previousLevel) {
        const previousRank = getRankForLevel(previousLevel);
        const newRank = getRankForLevel(newLevel);

        toast.success(`Level Up! Lv. ${newLevel} ${snapshot.rankName}`, {
          description: "Keep going — every chapter earns XP.",
        });

        if (previousRank.id !== newRank.id) {
          setRankUpEvent({
            rankId: newRank.id,
            rankName: newRank.name,
            level: newLevel,
            triggeredAt: Date.now(),
          });
        }
      }

      previousLevelRef.current = newLevel;
      setRankSnapshot(snapshot);
      return snapshot;
    } finally {
      setRankLoading(false);
    }
  }, [user]);

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

  useEffect(() => {
    void refreshRank();
  }, [refreshRank]);

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
    // All chapters are unlocked - no progression gating
    return true;
  }, []);

  const setDevMode = useCallback((enabled: boolean) => {
    if (!isAdmin && enabled) return; // Block non-admins from enabling
    localStorage.setItem(DEV_MODE_KEY, String(enabled));
    setDevModeState(enabled);
  }, [isAdmin]);

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
    await refreshRank();
    return { success: true };
  }, [user, progress, fetchProgress, refreshRank]);

  const markLessonIncomplete = useCallback(async (chapterId: number, lessonId: string) => {
    if (!user) return { error: "Not authenticated" };

    const existing = progress.find(p => p.chapter_id === chapterId);
    const currentLessons = existing?.lessons_completed || [];

    if (!currentLessons.includes(lessonId)) {
      return { success: true }; // Already incomplete
    }

    const updatedLessons = currentLessons.filter(id => id !== lessonId);

    if (existing) {
      // If no lessons remain, we can either delete the record or keep it with empty array
      // Keeping it with empty array is safer for data consistency
      const { error } = await externalSupabase
        .from("user_progress")
        .update({
          lessons_completed: updatedLessons,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id)
        .eq("chapter_id", chapterId);

      if (error) return { error: error.message };
    }

    await fetchProgress();
    await refreshRank();
    return { success: true };
  }, [user, progress, fetchProgress, refreshRank]);

  const value: UserProgressContextType = {
    user,
    progress,
    loading,
    authResolved,
    rankSnapshot,
    rankLoading,
    rankUpEvent,
    dismissRankUp,
    devMode,
    isAdmin,
    adminLoading,
    setDevMode,
    getChapterProgress,
    isChapterUnlocked,
    isSectionComplete,
    getLessonsCompleted,
    getTotalLessons,
    markLessonComplete,
    markLessonIncomplete,
    refreshRank,
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
