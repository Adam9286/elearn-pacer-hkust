import { externalSupabase } from "@/lib/externalSupabase";
import {
  createFallbackRankSnapshot,
  createRankSnapshotFromXp,
  getClampedXp,
  type UserRankSnapshot,
} from "@/utils/rankSystem";

type RankSnapshotRow = {
  user_id?: string | null;
  display_name?: string | null;
  total_xp?: number | string | null;
  updated_at?: string | null;
};

type RankOverrideRow = {
  user_id?: string | null;
  total_xp?: number | string | null;
  updated_at?: string | null;
};

export interface RankOverride {
  userId: string;
  totalXp: number;
  updatedAt: string | null;
}

export interface RankManagementUser {
  userId: string;
  email: string;
  displayName: string;
  totalXp: number;
  overrideTotalXp: number | null;
  updatedAt: string | null;
}

type RankManagementUserRow = {
  user_id?: string | null;
  email?: string | null;
  display_name?: string | null;
  total_xp?: number | string | null;
  override_total_xp?: number | string | null;
  updated_at?: string | null;
};

const isMissingRankSystemError = (error: { code?: string; message?: string } | null | undefined) =>
  Boolean(
    error &&
      (error.code === "42P01" ||
        error.code === "42883" ||
        error.code === "PGRST202" ||
        error.code === "PGRST205" ||
        error.message?.includes("user_rank_snapshots") ||
        error.message?.includes("user_rank_overrides") ||
        error.message?.includes("refresh_my_rank_snapshot") ||
        error.message?.includes("admin_list_users_for_rank_management") ||
        error.message?.includes("admin_set_user_rank_override") ||
        error.message?.includes("admin_clear_user_rank_override") ||
        error.message?.includes("schema cache")),
  );

export const getDisplayNameFromEmail = (email: string | null | undefined) => {
  const trimmed = email?.trim();
  if (!trimmed) return "Student";
  return trimmed.split("@")[0] || "Student";
};

const normalizeRankSnapshot = (
  row: RankSnapshotRow,
  fallbackUserId: string,
  fallbackDisplayName = "Student",
): UserRankSnapshot => {
  const userId = row.user_id || fallbackUserId;
  const displayName = row.display_name?.trim() || fallbackDisplayName;
  const totalXp = getClampedXp(row.total_xp ?? 0);

  return createRankSnapshotFromXp(userId, displayName, totalXp, row.updated_at ?? null);
};

const normalizeRankOverride = (row: RankOverrideRow): RankOverride | null => {
  if (!row.user_id) return null;

  return {
    userId: row.user_id,
    totalXp: getClampedXp(row.total_xp ?? 0),
    updatedAt: row.updated_at ?? null,
  };
};

export const applyRankOverride = (
  snapshot: UserRankSnapshot,
  override: RankOverride | null | undefined,
): UserRankSnapshot => {
  if (!override) return snapshot;

  return createRankSnapshotFromXp(
    snapshot.userId,
    snapshot.displayName,
    override.totalXp,
    override.updatedAt ?? snapshot.updatedAt,
  );
};

const fetchRankOverrides = async (userIds: string[]): Promise<Record<string, RankOverride>> => {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueUserIds.length === 0) return {};

  const { data, error } = await externalSupabase
    .from("user_rank_overrides")
    .select("user_id, total_xp, updated_at")
    .in("user_id", uniqueUserIds);

  if (error) {
    if (!isMissingRankSystemError(error)) {
      console.error("[Rank] Failed to load rank overrides:", error);
    }
    return {};
  }

  return (data ?? []).reduce<Record<string, RankOverride>>((overrides, row) => {
    const override = normalizeRankOverride(row as RankOverrideRow);
    if (override) {
      overrides[override.userId] = override;
    }
    return overrides;
  }, {});
};

export const refreshMyRankSnapshot = async (
  userId: string,
  displayName: string,
): Promise<UserRankSnapshot> => {
  const fallback = createFallbackRankSnapshot(userId, displayName);

  const { data, error } = await externalSupabase.rpc("refresh_my_rank_snapshot", {
    display_name_input: displayName,
  });

  const baseSnapshot = (() => {
    if (error) {
      if (!isMissingRankSystemError(error)) {
        console.error("[Rank] Failed to refresh rank snapshot:", error);
      }
      return fallback;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row !== "object") {
      return fallback;
    }

    return normalizeRankSnapshot(row as RankSnapshotRow, userId, displayName);
  })();

  const overrides = await fetchRankOverrides([userId]);
  return applyRankOverride(baseSnapshot, overrides[userId]);
};

export const fetchPublicRankSnapshots = async (
  userIds: string[],
): Promise<Record<string, UserRankSnapshot>> => {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueUserIds.length === 0) return {};

  const [{ data, error }, overrides] = await Promise.all([
    externalSupabase
      .from("user_rank_snapshots")
      .select("user_id, display_name, total_xp, updated_at")
      .in("user_id", uniqueUserIds),
    fetchRankOverrides(uniqueUserIds),
  ]);

  const snapshots = uniqueUserIds.reduce<Record<string, UserRankSnapshot>>((accumulator, userId) => {
    accumulator[userId] = createFallbackRankSnapshot(userId);
    return accumulator;
  }, {});

  if (error) {
    if (!isMissingRankSystemError(error)) {
      console.error("[Rank] Failed to load public rank snapshots:", error);
    }
  } else {
    for (const row of data ?? []) {
      const snapshot = normalizeRankSnapshot(row as RankSnapshotRow, row.user_id ?? "", "Student");
      snapshots[snapshot.userId] = snapshot;
    }
  }

  for (const userId of uniqueUserIds) {
    snapshots[userId] = applyRankOverride(snapshots[userId], overrides[userId]);
  }

  return snapshots;
};

export const searchRankManagementUsers = async (
  search = "",
  limit = 50,
): Promise<RankManagementUser[]> => {
  const { data, error } = await externalSupabase.rpc("admin_list_users_for_rank_management", {
    search_input: search.trim() || null,
    result_limit: limit,
  });

  if (error) {
    console.error("[Rank] Failed to search rank management users:", error);
    throw new Error(error.message || "Failed to load users");
  }

  return (data ?? []).map((row: RankManagementUserRow) => ({
    userId: row.user_id ?? "",
    email: row.email ?? "",
    displayName: row.display_name?.trim() || getDisplayNameFromEmail(row.email),
    totalXp: getClampedXp(row.total_xp ?? 0),
    overrideTotalXp:
      row.override_total_xp === null || row.override_total_xp === undefined
        ? null
        : getClampedXp(row.override_total_xp),
    updatedAt: row.updated_at ?? null,
  }));
};

export const setUserRankOverride = async (userId: string, totalXp: number): Promise<RankOverride> => {
  const { data, error } = await externalSupabase.rpc("admin_set_user_rank_override", {
    target_user_id: userId,
    total_xp_input: getClampedXp(totalXp),
  });

  if (error) {
    console.error("[Rank] Failed to save rank override:", error);
    throw new Error(error.message || "Failed to save rank override");
  }

  const row = Array.isArray(data) ? data[0] : data;
  const override = normalizeRankOverride((row ?? {}) as RankOverrideRow);

  if (!override) {
    throw new Error("Rank override was not returned");
  }

  return override;
};

export const clearUserRankOverride = async (userId: string): Promise<void> => {
  const { error } = await externalSupabase.rpc("admin_clear_user_rank_override", {
    target_user_id: userId,
  });

  if (error) {
    console.error("[Rank] Failed to clear rank override:", error);
    throw new Error(error.message || "Failed to clear rank override");
  }
};
