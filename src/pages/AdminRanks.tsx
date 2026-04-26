import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  Wrench,
} from "lucide-react";

import RankChip from "@/components/rank/RankChip";
import RankSummaryCard from "@/components/rank/RankSummaryCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUserProgress } from "@/contexts/UserProgressContext";
import {
  clearUserRankOverride,
  fetchPublicRankSnapshots,
  searchRankManagementUsers,
  setUserRankOverride,
  type RankManagementUser,
} from "@/services/rankService";
import {
  createRankSnapshotFromXp,
  getLevelFromXp,
  getRankForLevel,
  getTotalXpForLevel,
  LEVEL_XP_STEP,
  MAX_LEVEL,
} from "@/utils/rankSystem";
import { toast } from "sonner";

const SEARCH_DEBOUNCE_MS = 250;

const clampLevel = (value: number) => Math.min(MAX_LEVEL, Math.max(1, Math.floor(Number(value) || 1)));
const clampXp = (value: number) => Math.max(0, Math.floor(Number(value) || 0));

const parseLevelInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed || !/^-?\d+$/.test(trimmed)) {
    return null;
  }

  return Number.parseInt(trimmed, 10);
};

export default function AdminRanks() {
  const navigate = useNavigate();
  const { user, authResolved, isAdmin, adminLoading, devMode, rankSnapshot, refreshRank } = useUserProgress();

  const [searchTerm, setSearchTerm] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<RankManagementUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedSnapshotXp, setSelectedSnapshotXp] = useState(0);
  const [editorXp, setEditorXp] = useState(0);
  const [isOverrideActive, setIsOverrideActive] = useState(false);
  const [levelInputValue, setLevelInputValue] = useState("1");
  const [isEditingLevelInput, setIsEditingLevelInput] = useState(false);

  const createCurrentUserEntry = (currentUser: User): RankManagementUser => ({
    userId: currentUser.id,
    email: currentUser.email ?? "",
    displayName: rankSnapshot?.displayName || (currentUser.email?.split("@")[0] ?? "Student"),
    totalXp: rankSnapshot?.totalXp ?? 0,
    overrideTotalXp: null,
    updatedAt: rankSnapshot?.updatedAt ?? null,
  });

  const mergeCurrentUser = (
    nextUsers: RankManagementUser[],
    currentUser: User,
    currentSearch: string,
  ): RankManagementUser[] => {
    const ownEntry = createCurrentUserEntry(currentUser);
    const normalizedSearch = currentSearch.trim().toLowerCase();
    const matchesSearch =
      normalizedSearch.length === 0 ||
      ownEntry.email.toLowerCase().includes(normalizedSearch) ||
      ownEntry.displayName.toLowerCase().includes(normalizedSearch);

    const filteredUsers = nextUsers.filter((entry) => entry.userId !== currentUser.id);

    if (!matchesSearch) {
      return filteredUsers;
    }

    return [ownEntry, ...filteredUsers];
  };

  useEffect(() => {
    if (!authResolved || adminLoading || !user || !isAdmin || !devMode) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadUsers(searchTerm);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [adminLoading, authResolved, devMode, isAdmin, searchTerm, user]);

  const selectedUser = useMemo(
    () => users.find((entry) => entry.userId === selectedUserId) ?? null,
    [selectedUserId, users],
  );

  const selectedLevel = getLevelFromXp(editorXp);
  const derivedRank = getRankForLevel(selectedLevel);
  const selectedSnapshot = selectedUser
    ? createRankSnapshotFromXp(selectedUser.userId, selectedUser.displayName, editorXp, selectedUser.updatedAt)
    : null;

  async function loadUsers(search: string) {
    if (!user) return;

    setLoadingUsers(true);
    try {
      const nextUsers = mergeCurrentUser(await searchRankManagementUsers(search), user, search);
      setUsers(nextUsers);

      const nextSelectedUser =
        nextUsers.find((entry) => entry.userId === selectedUserId) ?? nextUsers[0] ?? null;

      if (!nextSelectedUser) {
        setSelectedUserId(null);
        setSelectedSnapshotXp(0);
        setEditorXp(0);
        setIsOverrideActive(false);
        return;
      }

      setSelectedUserId(nextSelectedUser.userId);
      setSelectedSnapshotXp(nextSelectedUser.totalXp);
      setEditorXp(nextSelectedUser.totalXp);
      setIsOverrideActive(nextSelectedUser.overrideTotalXp !== null);
    } catch (error) {
      const fallbackUsers = mergeCurrentUser([], user, search);
      setUsers(fallbackUsers);

      const nextSelectedUser =
        fallbackUsers.find((entry) => entry.userId === selectedUserId) ?? fallbackUsers[0] ?? null;

      if (nextSelectedUser) {
        setSelectedUserId(nextSelectedUser.userId);
        setSelectedSnapshotXp(nextSelectedUser.totalXp);
        setEditorXp(nextSelectedUser.totalXp);
        setIsOverrideActive(nextSelectedUser.overrideTotalXp !== null);
      }

      const message = error instanceof Error ? error.message : "Failed to load users";
      toast.error(`User search is unavailable in Supabase. Showing your account only. ${message}`);
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    if (isEditingLevelInput) {
      return;
    }

    setLevelInputValue(String(selectedLevel));
  }, [isEditingLevelInput, selectedLevel]);

  async function refreshSelectedUser(userId: string) {
    const snapshots = await fetchPublicRankSnapshots([userId]);
    const snapshot = snapshots[userId];
    if (!snapshot) return;

    setSelectedSnapshotXp(snapshot.totalXp);
    setEditorXp(snapshot.totalXp);
  }

  const handleSelectUser = async (nextUser: RankManagementUser) => {
    setSelectedUserId(nextUser.userId);
    setSelectedSnapshotXp(nextUser.totalXp);
    setEditorXp(nextUser.totalXp);
    setIsOverrideActive(nextUser.overrideTotalXp !== null);

    await refreshSelectedUser(nextUser.userId);
  };

  const handleXpChange = (value: string) => {
    setEditorXp(clampXp(Number(value)));
  };

  const handleLevelInputApply = () => {
    setIsEditingLevelInput(false);

    const parsedLevel = parseLevelInput(levelInputValue);
    if (parsedLevel === null || parsedLevel < 1 || parsedLevel > MAX_LEVEL) {
      setLevelInputValue(String(selectedLevel));
      return;
    }

    const nextLevel = clampLevel(parsedLevel);
    setEditorXp(getTotalXpForLevel(nextLevel));
  };

  const handleResetEditor = () => {
    setEditorXp(selectedSnapshotXp);
  };

  const handleSave = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      await setUserRankOverride(selectedUser.userId, editorXp);
      toast.success(`Saved override for ${selectedUser.displayName}`);
      setIsOverrideActive(true);
      await loadUsers(searchTerm);
      await refreshSelectedUser(selectedUser.userId);

      if (user?.id === selectedUser.userId) {
        await refreshRank();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save override";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleClearOverride = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      await clearUserRankOverride(selectedUser.userId);
      toast.success(`Cleared override for ${selectedUser.displayName}`);
      setIsOverrideActive(false);
      await loadUsers(searchTerm);
      await refreshSelectedUser(selectedUser.userId);

      if (user?.id === selectedUser.userId) {
        await refreshRank();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to clear override";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!authResolved || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading admin access...</span>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin || !devMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-lg border-border/70 bg-card/85">
          <CardHeader>
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-6 w-6 text-amber-400" />
              <div>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>
                  Rank management is only available to admins while dev mode is enabled.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/platform")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Platform
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-card/70 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/platform")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Rank Management</h1>
              <p className="text-sm text-muted-foreground">
                Dev-mode admin overrides for user XP, level, and derived rank.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-200">
            <Wrench className="mr-2 h-3.5 w-3.5" />
            Dev Mode
          </Badge>
        </div>
      </header>

      <main className="container mx-auto grid gap-6 px-4 py-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="border-border/70 bg-card/85">
          <CardHeader className="space-y-3">
            <div>
              <CardTitle className="text-lg">Users</CardTitle>
              <CardDescription>Search by email or display name.</CardDescription>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search users"
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[32rem] pr-3">
              <div className="space-y-2">
                {loadingUsers ? (
                  <div className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-4 text-sm text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Loading users...</span>
                  </div>
                ) : null}

                {!loadingUsers && users.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 px-3 py-8 text-center text-sm text-muted-foreground">
                    No users matched this search.
                  </div>
                ) : null}

                {users.map((entry) => {
                  const snapshot = createRankSnapshotFromXp(entry.userId, entry.displayName, entry.totalXp, entry.updatedAt);
                  const isSelected = entry.userId === selectedUserId;

                  return (
                    <button
                      key={entry.userId}
                      type="button"
                      onClick={() => void handleSelectUser(entry)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                        isSelected
                          ? "border-primary/50 bg-primary/10 shadow-glow"
                          : "border-border/60 bg-background/40 hover:border-primary/30 hover:bg-background/70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{entry.displayName}</p>
                          <p className="truncate text-xs text-muted-foreground">{entry.email}</p>
                        </div>
                        {entry.overrideTotalXp !== null ? (
                          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-200">
                            Override
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <RankChip snapshot={snapshot} size="sm" className="bg-background/60" />
                        <span className="text-xs text-muted-foreground">
                          {entry.totalXp.toLocaleString()} XP
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/70 bg-card/85">
            <CardHeader>
              <CardTitle className="text-lg">Override Editor</CardTitle>
              <CardDescription>
                XP is the source of truth. Level and rank update from it automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedUser ? (
                <>
                  <div className="grid gap-4 rounded-xl border border-border/60 bg-background/35 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                    <div>
                      <p className="text-base font-semibold text-foreground">{selectedUser.displayName}</p>
                      <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {isOverrideActive ? (
                        <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-200">
                          Override active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-border/60 bg-background/50 text-muted-foreground">
                          Using normal progression
                        </Badge>
                      )}
                      <RankChip snapshot={selectedSnapshot} size="md" className="bg-background/60" />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="rank-override-xp">Total XP</Label>
                      <Input
                        id="rank-override-xp"
                        type="number"
                        min={0}
                        step={LEVEL_XP_STEP}
                        value={editorXp}
                        onChange={(event) => handleXpChange(event.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Boundary examples: 0 XP {"->"} Lv. 1, 1000 XP {"->"} Lv. 11, 9000 XP {"->"} Lv. 91.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rank-override-level">Level</Label>
                      <Input
                        id="rank-override-level"
                        type="number"
                        step={1}
                        value={levelInputValue}
                        onChange={(event) => setLevelInputValue(event.target.value)}
                        onFocus={() => setIsEditingLevelInput(true)}
                        onBlur={handleLevelInputApply}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleLevelInputApply();
                            event.currentTarget.blur();
                          }
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Editing level snaps XP to the start of that level.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-xl border border-border/60 bg-background/35 p-4 md:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Derived Level</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">Lv. {selectedLevel}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Derived Rank</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{derivedRank.name}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">XP in Level</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {editorXp - getTotalXpForLevel(selectedLevel)}
                      </p>
                    </div>
                  </div>

                  {selectedSnapshot ? <RankSummaryCard snapshot={selectedSnapshot} /> : null}

                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => void handleSave()} disabled={saving}>
                      {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Override
                    </Button>
                    <Button variant="outline" onClick={handleResetEditor} disabled={saving || editorXp === selectedSnapshotXp}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset Editor
                    </Button>
                    <Button variant="secondary" onClick={() => void handleClearOverride()} disabled={saving || !isOverrideActive}>
                      Clear Override
                    </Button>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 px-4 py-12 text-center text-sm text-muted-foreground">
                  Select a user to edit their rank override.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
