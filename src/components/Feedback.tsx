import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bug,
  EyeOff,
  Lightbulb,
  MessageSquareQuote,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";

import RankChip from "@/components/rank/RankChip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useUserProgress } from "@/contexts/UserProgressContext";
import { externalSupabase } from "@/lib/externalSupabase";
import { cn } from "@/lib/utils";
import { fetchPublicRankSnapshots } from "@/services/rankService";
import type { UserRankSnapshot } from "@/utils/rankSystem";
import { toast } from "sonner";

interface FeedbackItem {
  id: string;
  user_id: string;
  user_email: string;
  category: string;
  title: string;
  content: string;
  created_at: string;
}

const anonymousPrefix = "[ANON]";

const categoryMeta = {
  platform: {
    label: "Platform",
    formLabel: "Platform Issue",
    icon: Bug,
    chipClass: "border-blue-500/30 bg-blue-500/10 text-blue-300",
    activeClass: "border-blue-500/40 bg-blue-500/15 text-blue-200 shadow-glow",
  },
  course: {
    label: "Course",
    formLabel: "Course Content",
    icon: Lightbulb,
    chipClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    activeClass: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200 shadow-glow",
  },
  bug: {
    label: "Bug",
    formLabel: "Bug Report",
    icon: Bug,
    chipClass: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    activeClass: "border-rose-500/40 bg-rose-500/15 text-rose-200 shadow-glow",
  },
  feature: {
    label: "Feature",
    formLabel: "Feature Request",
    icon: Sparkles,
    chipClass: "border-violet-500/30 bg-violet-500/10 text-violet-300",
    activeClass: "border-violet-500/40 bg-violet-500/15 text-violet-200 shadow-glow",
  },
  other: {
    label: "Other",
    formLabel: "Other",
    icon: MessageSquareQuote,
    chipClass: "border-slate-500/30 bg-slate-500/10 text-slate-300",
    activeClass: "border-slate-500/40 bg-slate-500/15 text-slate-200 shadow-glow",
  },
} as const;

const categoryOrder = ["platform", "course", "bug", "feature", "other"] as const;
const filterOptions = ["all", ...categoryOrder] as const;

type FeedbackCategory = (typeof categoryOrder)[number];
type FeedbackFilter = (typeof filterOptions)[number];

const isAnonymousPost = (content: string) => content.startsWith(anonymousPrefix);
const getCleanContent = (content: string) =>
  isAnonymousPost(content) ? content.slice(anonymousPrefix.length).trimStart() : content;
const getDisplayName = (email: string | undefined, content: string) => {
  if (isAnonymousPost(content)) return "Anonymous";
  return email?.split("@")[0] || "User";
};
const getCategoryMeta = (category: string) =>
  categoryMeta[(category as FeedbackCategory) || "other"] ?? categoryMeta.other;

const Feedback = () => {
  const { user, isAdmin } = useUserProgress();
  const shouldReduceMotion = useReducedMotion();
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [rankSnapshots, setRankSnapshots] = useState<Record<string, UserRankSnapshot>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FeedbackFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory | "">("");
  const [feedbackAnonymous, setFeedbackAnonymous] = useState(false);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  useEffect(() => {
    const visibleAuthorIds = feedbacks
      .filter((item) => !isAnonymousPost(item.content))
      .map((item) => item.user_id)
      .filter(Boolean);

    if (visibleAuthorIds.length === 0) {
      setRankSnapshots({});
      return;
    }

    let isCurrent = true;

    fetchPublicRankSnapshots(visibleAuthorIds).then((snapshots) => {
      if (isCurrent) {
        setRankSnapshots(snapshots);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [feedbacks]);

  const fetchFeedbacks = async () => {
    setLoading(true);

    const { data, error } = await externalSupabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load feedback");
    } else if (data) {
      setFeedbacks(data);
    }

    setLoading(false);
  };

  const categoryCounts = useMemo(() => {
    return feedbacks.reduce<Record<FeedbackCategory, number>>(
      (counts, item) => {
        const category = categoryOrder.includes(item.category as FeedbackCategory)
          ? (item.category as FeedbackCategory)
          : "other";
        counts[category] += 1;
        return counts;
      },
      { platform: 0, course: 0, bug: 0, feature: 0, other: 0 },
    );
  }, [feedbacks]);

  const filteredFeedbacks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return feedbacks.filter((item) => {
      const matchesFilter = activeFilter === "all" || item.category === activeFilter;
      if (!matchesFilter) return false;

      if (!normalizedQuery) return true;

      return [item.title, getCleanContent(item.content), getDisplayName(item.user_email, item.content)]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [activeFilter, feedbacks, searchQuery]);

  const totalCount = feedbacks.length;
  const visibleCount = filteredFeedbacks.length;
  const latestFeedback = feedbacks[0] ?? null;
  const latestLabel = latestFeedback
    ? formatDistanceToNow(new Date(latestFeedback.created_at), { addSuffix: true })
    : "No posts yet";

  const resetComposer = () => {
    setFeedbackTitle("");
    setFeedbackContent("");
    setFeedbackCategory("");
    setFeedbackAnonymous(false);
  };

  const submitFeedback = async () => {
    if (!user || !feedbackTitle.trim() || !feedbackContent.trim() || !feedbackCategory) {
      toast.error("Please fill in all fields");
      return;
    }

    setSubmitting(true);

    const trimmedContent = feedbackContent.trim();
    const contentToSave = feedbackAnonymous ? `${anonymousPrefix}${trimmedContent}` : trimmedContent;

    const { error } = await externalSupabase.from("feedback").insert({
      user_id: user.id,
      user_email: user.email,
      category: feedbackCategory,
      title: feedbackTitle.trim(),
      content: contentToSave,
    });

    if (error) {
      toast.error("Failed to submit feedback");
      setSubmitting(false);
      return;
    }

    toast.success("Feedback submitted");
    resetComposer();
    setActiveFilter("all");
    setSearchQuery("");
    setIsPostDialogOpen(false);
    await fetchFeedbacks();
    setSubmitting(false);
  };

  const deleteFeedback = async (id: string) => {
    const { error } = await externalSupabase.from("feedback").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete feedback");
      return;
    }

    toast.success("Feedback deleted");
    await fetchFeedbacks();
  };

  const renderComposerDialog = (
    <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
      <DialogContent className="max-w-2xl border-border/70 bg-card/95 text-foreground backdrop-blur">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Post feedback
          </DialogTitle>
          <DialogDescription>Share one issue, idea, or comment.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Category</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {categoryOrder.map((category) => {
                const meta = categoryMeta[category];
                const Icon = meta.icon;
                const isActive = feedbackCategory === category;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setFeedbackCategory(category)}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition-smooth",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      isActive
                        ? meta.activeClass
                        : "border-border/70 bg-background/40 hover:border-primary/30 hover:bg-background/70",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("rounded-xl border border-border/70 p-2", meta.chipClass)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="font-medium text-foreground">{meta.formLabel}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="feedback-title" className="text-sm font-medium text-foreground">
              Title
            </label>
            <Input
              id="feedback-title"
              placeholder="Short title"
              value={feedbackTitle}
              onChange={(event) => setFeedbackTitle(event.target.value)}
              className="h-12 border-border/70 bg-background/45"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="feedback-body" className="text-sm font-medium text-foreground">
              Comment
            </label>
            <Textarea
              id="feedback-body"
              placeholder="Write your feedback"
              value={feedbackContent}
              onChange={(event) => setFeedbackContent(event.target.value)}
              rows={6}
              className="min-h-[150px] border-border/70 bg-background/45 leading-6"
            />
          </div>

          <label
            htmlFor="feedback-anonymous"
            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border/70 bg-background/35 p-4"
          >
            <Checkbox
              id="feedback-anonymous"
              checked={feedbackAnonymous}
              onCheckedChange={(checked) => setFeedbackAnonymous(Boolean(checked))}
            />
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <EyeOff className="h-4 w-4 text-muted-foreground" />
              Post anonymously
            </span>
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={() => setIsPostDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={submitFeedback}
            disabled={submitting}
            className="gradient-primary shadow-glow"
          >
            <Send className="mr-2 h-4 w-4" />
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-5">
        <Card className="glass-card border-border/70">
          <CardContent className="space-y-4 p-5 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="h-5 w-32 animate-pulse rounded-full bg-muted/65" />
                <div className="h-9 w-72 max-w-full animate-pulse rounded-2xl bg-muted/70" />
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="h-11 w-64 animate-pulse rounded-xl bg-muted/60" />
                <div className="h-11 w-36 animate-pulse rounded-xl bg-muted/60" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/70">
          <CardContent className="space-y-3 p-4 md:p-6">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="rounded-2xl border border-border/60 bg-muted/35 p-4">
                <div className="h-4 w-24 animate-pulse rounded-full bg-muted/70" />
                <div className="mt-3 h-5 w-2/3 animate-pulse rounded-full bg-muted/70" />
                <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-muted/60" />
                <div className="mt-2 h-4 w-4/5 animate-pulse rounded-full bg-muted/60" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  const toolbar = (
    <Card className="glass-card border-border/70">
      <CardContent className="space-y-4 p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-primary/30 bg-primary/10 text-primary">Feedback Board</Badge>
              <Badge variant="outline" className="border-border/70 bg-background/40 text-muted-foreground">
                {visibleCount} / {totalCount}
              </Badge>
              <Badge variant="outline" className="border-border/70 bg-background/40 text-muted-foreground">
                Latest {latestLabel}
              </Badge>
            </div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Class feedback
            </h2>
          </div>

          <Button
            type="button"
            onClick={() => setIsPostDialogOpen(true)}
            disabled={!user}
            className="gradient-primary shadow-glow self-start lg:self-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            Post feedback
          </Button>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative xl:w-full xl:max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search feedback"
              className="h-11 border-border/70 bg-background/45 pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {filterOptions.map((filterValue) => {
              const isActive = activeFilter === filterValue;
              const label = filterValue === "all" ? "All" : categoryMeta[filterValue].label;
              const count = filterValue === "all" ? totalCount : categoryCounts[filterValue];

              return (
                <button
                  key={filterValue}
                  type="button"
                  onClick={() => setActiveFilter(filterValue)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-smooth",
                    isActive
                      ? "border-primary/35 bg-primary/10 text-primary shadow-glow"
                      : "border-border/70 bg-background/40 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label} <span className="text-xs opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {!user ? (
          <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3 text-sm text-muted-foreground">
            Sign in to post feedback.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  const emptyState = (
    <Card className="border-border/70 bg-background/45">
      <CardContent className="p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-card/75">
          <MessageSquareQuote className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="mt-4 text-base font-medium text-foreground">
          {totalCount === 0 ? "No feedback yet." : "No matching feedback."}
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {totalCount === 0 ? "Post the first note." : "Try another search or category."}
        </p>
        {user ? (
          <Button
            type="button"
            onClick={() => setIsPostDialogOpen(true)}
            className="mt-5 gradient-primary shadow-glow"
          >
            <Plus className="mr-2 h-4 w-4" />
            Post feedback
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );

  const feedbackBoard = (
    <Card className="glass-card relative overflow-hidden border-border/70">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,hsl(var(--primary)/0.18),transparent_24%),radial-gradient(circle_at_88%_18%,hsl(var(--accent)/0.12),transparent_22%)]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <CardContent className="relative p-3 md:p-5">
        <div className="mb-3 flex items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
          <span>Latest first</span>
          <span>{visibleCount} shown</span>
        </div>

        <ScrollArea className="h-[min(72vh,56rem)] pr-3">
          {filteredFeedbacks.length === 0 ? (
            emptyState
          ) : (
            <div className="space-y-4 pb-1">
              <AnimatePresence initial={false}>
                {filteredFeedbacks.map((item, index) => {
                  const meta = getCategoryMeta(item.category);
                  const Icon = meta.icon;
                  const canDelete = Boolean(user && (user.id === item.user_id || isAdmin));
                  const isAnonymous = isAnonymousPost(item.content);
                  const authorRank = isAnonymous ? null : rankSnapshots[item.user_id];

                  return (
                    <motion.article
                      key={item.id}
                      layout
                      initial={
                        shouldReduceMotion
                          ? { opacity: 0 }
                          : { opacity: 0, y: 16, rotate: index % 2 === 0 ? -0.4 : 0.4 }
                      }
                      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, rotate: 0 }}
                      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -8 }}
                      transition={{
                        duration: shouldReduceMotion ? 0.12 : 0.24,
                        delay: shouldReduceMotion ? 0 : Math.min(index * 0.025, 0.18),
                        ease: "easeOut",
                      }}
                      whileHover={
                        shouldReduceMotion
                          ? undefined
                          : { y: -3, rotate: index % 2 === 0 ? -0.2 : 0.2 }
                      }
                      className="group relative pt-3"
                    >
                      <div className="pointer-events-none absolute left-6 top-2 z-10 h-3 w-3 rounded-full border border-primary/40 bg-primary shadow-glow transition-transform group-hover:rotate-12" />
                      <div className="pointer-events-none absolute left-7 top-5 h-4 w-px bg-primary/30" />

                      <Card className="border-border/70 bg-card/92 shadow-sm transition-smooth group-hover:border-primary/35 group-hover:shadow-glow">
                        <CardContent className="p-4 md:p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <Badge className={cn("border", meta.chipClass)}>
                                <Icon className="mr-1 h-3 w-3" />
                                {meta.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {getDisplayName(item.user_email, item.content)}
                              </span>
                              <RankChip snapshot={authorRank} size="sm" className="bg-card/80" />
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                              </span>
                            </div>

                            {canDelete ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteFeedback(item.id)}
                                aria-label={`Delete feedback titled ${item.title}`}
                                className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>

                          <h3 className="mt-3 break-words text-base font-semibold tracking-tight text-foreground md:text-lg">
                            {item.title}
                          </h3>
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-foreground/85">
                            {getCleanContent(item.content)}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {toolbar}
      {feedbackBoard}
      {renderComposerDialog}
    </div>
  );
};

export default Feedback;
