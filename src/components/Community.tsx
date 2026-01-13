import { useState, useEffect } from "react";
import { MessageSquare, Send, Megaphone, MessageCircle, Plus, ChevronDown, ChevronUp, Trash2, Pin, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { externalSupabase } from "@/lib/externalSupabase";
import { useUserProgress } from "@/contexts/UserProgressContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  created_at: string;
}

interface Discussion {
  id: string;
  user_id: string;
  user_email: string;
  title: string;
  content: string;
  created_at: string;
  replies?: Reply[];
}

interface Reply {
  id: string;
  user_id: string;
  user_email: string;
  content: string;
  created_at: string;
}

interface Feedback {
  id: string;
  user_id: string;
  user_email: string;
  category: string;
  title: string;
  content: string;
  created_at: string;
}

const categoryColors: Record<string, string> = {
  platform: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  course: "bg-green-500/20 text-green-400 border-green-500/30",
  bug: "bg-red-500/20 text-red-400 border-red-500/30",
  feature: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  other: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

type SectionType = 'announcements' | 'discussions' | 'feedback';

const Community = () => {
  const { user, isAdmin } = useUserProgress();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState<SectionType>('announcements');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDiscussion, setExpandedDiscussion] = useState<string | null>(null);

  // Last seen timestamps for notification badges
  const [lastSeen, setLastSeen] = useState<Record<SectionType, string>>(() => {
    const saved = localStorage.getItem('community_last_seen');
    return saved ? JSON.parse(saved) : {
      announcements: new Date(0).toISOString(),
      discussions: new Date(0).toISOString(),
      feedback: new Date(0).toISOString(),
    };
  });

  // Form states
  const [newDiscussionOpen, setNewDiscussionOpen] = useState(false);
  const [newAnnouncementOpen, setNewAnnouncementOpen] = useState(false);
  const [discussionTitle, setDiscussionTitle] = useState("");
  const [discussionContent, setDiscussionContent] = useState("");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementPinned, setAnnouncementPinned] = useState(false);
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackCategory, setFeedbackCategory] = useState<string>("");
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  
  // Anonymous posting states
  const [discussionAnonymous, setDiscussionAnonymous] = useState(false);
  const [feedbackAnonymous, setFeedbackAnonymous] = useState(false);
  const [replyAnonymous, setReplyAnonymous] = useState<Record<string, boolean>>({});

  // Calculate unread count for a section
  const getUnreadCount = (section: SectionType): number => {
    const lastSeenDate = new Date(lastSeen[section]);
    switch (section) {
      case 'announcements':
        return announcements.filter(a => new Date(a.created_at) > lastSeenDate).length;
      case 'discussions':
        return discussions.filter(d => new Date(d.created_at) > lastSeenDate).length;
      case 'feedback':
        return feedbacks.filter(f => new Date(f.created_at) > lastSeenDate).length;
      default:
        return 0;
    }
  };

  // Handle section click - mark as seen
  const handleSectionClick = (section: SectionType) => {
    setActiveSection(section);
    const updated = { ...lastSeen, [section]: new Date().toISOString() };
    setLastSeen(updated);
    localStorage.setItem('community_last_seen', JSON.stringify(updated));
  };

  // Helper functions for anonymous posting
  const isAnonymousPost = (content: string) => content.startsWith('[ANON]');
  
  const getCleanContent = (content: string) => 
    isAnonymousPost(content) ? content.replace('[ANON]', '') : content;
  
  const getDisplayName = (email: string | undefined, content: string) => {
    if (isAnonymousPost(content)) {
      return "Anonymous";
    }
    return email?.split("@")[0] || "User";
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchAnnouncements(), fetchDiscussions(), fetchFeedbacks()]);
    setLoading(false);
  };

  const fetchAnnouncements = async () => {
    const { data, error } = await externalSupabase
      .from("announcements")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (!error && data) setAnnouncements(data);
  };

  const fetchDiscussions = async () => {
    const { data, error } = await externalSupabase
      .from("discussions")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      const discussionsWithReplies = await Promise.all(
        data.map(async (d) => {
          const { data: replies } = await externalSupabase
            .from("discussion_replies")
            .select("*")
            .eq("discussion_id", d.id)
            .order("created_at", { ascending: true });
          return { ...d, replies: replies || [] };
        })
      );
      setDiscussions(discussionsWithReplies);
    }
  };

  const fetchFeedbacks = async () => {
    const { data, error } = await externalSupabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setFeedbacks(data);
  };

  const submitDiscussion = async () => {
    if (!user || !discussionTitle.trim() || !discussionContent.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    const contentToSave = discussionAnonymous 
      ? `[ANON]${discussionContent}` 
      : discussionContent;
      
    const { error } = await externalSupabase.from("discussions").insert({
      user_id: user.id,
      user_email: user.email,
      title: discussionTitle,
      content: contentToSave,
    });
    if (error) {
      toast.error("Failed to post discussion");
    } else {
      toast.success("Discussion posted!");
      setDiscussionTitle("");
      setDiscussionContent("");
      setDiscussionAnonymous(false);
      setNewDiscussionOpen(false);
      fetchDiscussions();
    }
  };

  const submitReply = async (discussionId: string) => {
    if (!user || !replyContent[discussionId]?.trim()) {
      toast.error("Please enter a reply");
      return;
    }
    const isAnon = replyAnonymous[discussionId] || false;
    const contentToSave = isAnon 
      ? `[ANON]${replyContent[discussionId]}` 
      : replyContent[discussionId];
      
    const { error } = await externalSupabase.from("discussion_replies").insert({
      discussion_id: discussionId,
      user_id: user.id,
      user_email: user.email,
      content: contentToSave,
    });
    if (error) {
      toast.error("Failed to post reply");
    } else {
      toast.success("Reply posted!");
      setReplyContent((prev) => ({ ...prev, [discussionId]: "" }));
      setReplyAnonymous((prev) => ({ ...prev, [discussionId]: false }));
      fetchDiscussions();
    }
  };

  const submitFeedback = async () => {
    if (!user || !feedbackTitle.trim() || !feedbackContent.trim() || !feedbackCategory) {
      toast.error("Please fill in all fields");
      return;
    }
    const contentToSave = feedbackAnonymous 
      ? `[ANON]${feedbackContent}` 
      : feedbackContent;
      
    const { error } = await externalSupabase.from("feedback").insert({
      user_id: user.id,
      user_email: user.email,
      category: feedbackCategory,
      title: feedbackTitle,
      content: contentToSave,
    });
    if (error) {
      toast.error("Failed to submit feedback");
    } else {
      toast.success("Feedback submitted! Thank you!");
      setFeedbackTitle("");
      setFeedbackContent("");
      setFeedbackCategory("");
      setFeedbackAnonymous(false);
      fetchFeedbacks();
    }
  };

  const submitAnnouncement = async () => {
    if (!user || !announcementTitle.trim() || !announcementContent.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    const { error } = await externalSupabase.from("announcements").insert({
      user_id: user.id,
      title: announcementTitle,
      content: announcementContent,
      pinned: announcementPinned,
    });
    if (error) {
      toast.error("Failed to post announcement");
    } else {
      toast.success("Announcement posted!");
      setAnnouncementTitle("");
      setAnnouncementContent("");
      setAnnouncementPinned(false);
      setNewAnnouncementOpen(false);
      fetchAnnouncements();
    }
  };

  const deleteDiscussion = async (id: string) => {
    const { error } = await externalSupabase.from("discussions").delete().eq("id", id);
    if (!error) {
      toast.success("Discussion deleted");
      fetchDiscussions();
    }
  };

  const deleteAnnouncement = async (id: string) => {
    const { error } = await externalSupabase.from("announcements").delete().eq("id", id);
    if (!error) {
      toast.success("Announcement deleted");
      fetchAnnouncements();
    }
  };

  const deleteFeedback = async (id: string) => {
    const { error } = await externalSupabase.from("feedback").delete().eq("id", id);
    if (!error) {
      toast.success("Feedback deleted");
      fetchFeedbacks();
    } else {
      toast.error("Failed to delete feedback");
    }
  };

  // Navigation Item Component
  const NavItem = ({ 
    icon: Icon, 
    label, 
    section 
  }: { 
    icon: React.ElementType; 
    label: string; 
    section: SectionType;
  }) => {
    const unreadCount = getUnreadCount(section);
    
    return (
      <button
        onClick={() => handleSectionClick(section)}
        className={cn(
          "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
          "hover:bg-accent/10 group relative",
          activeSection === section && "bg-accent/20"
        )}
      >
        {/* Active indicator bar */}
        <div className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full transition-all duration-200",
          activeSection === section ? "bg-primary opacity-100" : "opacity-0"
        )} />
        
        <div className={cn(
          "p-2 rounded-lg transition-colors relative",
          activeSection === section 
            ? "bg-primary/20 text-primary" 
            : "bg-muted/50 text-muted-foreground group-hover:bg-muted group-hover:text-foreground"
        )}>
          <Icon className="w-5 h-5" />
          {/* Notification dot */}
          {unreadCount > 0 && activeSection !== section && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-destructive rounded-full animate-pulse" />
          )}
        </div>
        
        <span className={cn(
          "flex-1 text-left font-medium transition-colors",
          activeSection === section ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
        )}>
          {label}
        </span>
      </button>
    );
  };

  // Mobile Tab Navigation
  const MobileNav = () => (
    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
      {[
        { section: 'announcements' as SectionType, icon: Megaphone, label: 'Announcements' },
        { section: 'discussions' as SectionType, icon: MessageCircle, label: 'Discussions' },
        { section: 'feedback' as SectionType, icon: Send, label: 'Feedback' },
      ].map(({ section, icon: Icon, label }) => {
        const unreadCount = getUnreadCount(section);
        return (
          <button
            key={section}
            onClick={() => handleSectionClick(section)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all relative",
              activeSection === section 
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            <div className="relative">
              <Icon className="w-4 h-4" />
              {/* Notification dot */}
              {unreadCount > 0 && activeSection !== section && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
              )}
            </div>
            <span className="font-medium">{label}</span>
          </button>
        );
      })}
    </div>
  );

  if (!user) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MessageSquare className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Sign in to join the community</h3>
          <p className="text-muted-foreground text-center">
            Connect with other students, share feedback, and stay updated with announcements.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="glass-card animate-pulse">
            <CardContent className="h-32" />
          </Card>
        ))}
      </div>
    );
  }

  // Announcements Timeline View
  const AnnouncementsSection = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {isAdmin && (
        <Dialog open={newAnnouncementOpen} onOpenChange={setNewAnnouncementOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
              <DialogDescription>Post an announcement for all students.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Announcement title"
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
              />
              <Textarea
                placeholder="Announcement content..."
                value={announcementContent}
                onChange={(e) => setAnnouncementContent(e.target.value)}
                rows={4}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={announcementPinned}
                  onChange={(e) => setAnnouncementPinned(e.target.checked)}
                  className="rounded"
                />
                Pin this announcement
              </label>
              <Button onClick={submitAnnouncement} className="w-full">
                Post Announcement
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {announcements.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-8 text-center text-muted-foreground">
            No announcements yet.
          </CardContent>
        </Card>
      ) : (
        <div className="relative pl-8">
          {/* Timeline vertical line */}
          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/50 via-border to-transparent" />
          
          {announcements.map((a, index) => (
            <motion.div 
              key={a.id} 
              className="relative mb-6 last:mb-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* Timeline dot */}
              <div className={cn(
                "absolute -left-5 top-4 w-4 h-4 rounded-full border-2 transition-all",
                a.pinned 
                  ? "bg-primary border-primary shadow-lg shadow-primary/50" 
                  : "bg-background border-muted-foreground/50"
              )}>
                {a.pinned && (
                  <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-25" />
                )}
              </div>
              
              <Card className={cn(
                "glass-card ml-2 transition-all hover:shadow-lg",
                a.pinned && "border-primary/30 shadow-primary/10"
              )}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {a.pinned && (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                          <Pin className="w-3 h-3 mr-1" />
                          Pinned
                        </Badge>
                      )}
                      <CardTitle className="text-lg">{a.title}</CardTitle>
                    </div>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => deleteAnnouncement(a.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <CardDescription>
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{a.content}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );

  // Discussions Section
  const DiscussionsSection = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <Dialog open={newDiscussionOpen} onOpenChange={setNewDiscussionOpen}>
        <DialogTrigger asChild>
          <Button className="w-full gradient-primary">
            <Plus className="w-4 h-4 mr-2" />
            Start a Discussion
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a Discussion</DialogTitle>
            <DialogDescription>Ask questions or start a conversation with other students.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              placeholder="Discussion title"
              value={discussionTitle}
              onChange={(e) => setDiscussionTitle(e.target.value)}
            />
            <Textarea
              placeholder="What's on your mind?"
              value={discussionContent}
              onChange={(e) => setDiscussionContent(e.target.value)}
              rows={4}
            />
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="anonymous-discussion"
                checked={discussionAnonymous}
                onCheckedChange={(checked) => setDiscussionAnonymous(checked === true)}
              />
              <label 
                htmlFor="anonymous-discussion" 
                className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer"
              >
                <EyeOff className="w-4 h-4" />
                Post anonymously
              </label>
            </div>
            <Button onClick={submitDiscussion} className="w-full">
              Post Discussion
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {discussions.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-8 text-center text-muted-foreground">
            No discussions yet. Be the first to start one!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {discussions.map((d, index) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                expandedDiscussion === d.id && "md:col-span-2"
              )}
            >
              <Card className="glass-card h-full transition-all hover:shadow-lg">
                <Collapsible
                  open={expandedDiscussion === d.id}
                  onOpenChange={() => setExpandedDiscussion(expandedDiscussion === d.id ? null : d.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{d.title}</CardTitle>
                        <CardDescription>
                          {getDisplayName(d.user_email, d.content)} •{" "}
                          {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {d.user_id === user?.id && (
                          <Button variant="ghost" size="icon" onClick={() => deleteDiscussion(d.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-1">
                            <MessageCircle className="w-4 h-4" />
                            <span className="font-semibold">{d.replies?.length || 0}</span>
                            {expandedDiscussion === d.id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className={cn(
                      "text-sm whitespace-pre-wrap mb-4",
                      expandedDiscussion !== d.id && "line-clamp-2"
                    )}>
                      {getCleanContent(d.content)}
                    </p>
                    <CollapsibleContent className="space-y-4">
                      <div className="border-t pt-4 space-y-3">
                        {d.replies?.map((r) => (
                          <div key={r.id} className="bg-muted/30 rounded-lg p-3">
                            <p className="text-sm">{getCleanContent(r.content)}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {getDisplayName(r.user_email, r.content)} •{" "}
                              {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        ))}
                        <div className="flex gap-2 items-center">
                          <Input
                            placeholder="Write a reply..."
                            value={replyContent[d.id] || ""}
                            onChange={(e) =>
                              setReplyContent((prev) => ({ ...prev, [d.id]: e.target.value }))
                            }
                            onKeyDown={(e) => e.key === "Enter" && submitReply(d.id)}
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setReplyAnonymous(prev => ({ 
                              ...prev, 
                              [d.id]: !prev[d.id] 
                            }))}
                            className={replyAnonymous[d.id] ? "text-primary" : "text-muted-foreground"}
                            title={replyAnonymous[d.id] ? "Posting anonymously" : "Posting with your name"}
                          >
                            {replyAnonymous[d.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button size="icon" onClick={() => submitReply(d.id)}>
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </CardContent>
                </Collapsible>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );

  // Feedback Section
  const FeedbackSection = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Submit Feedback</CardTitle>
          <CardDescription>
            Help us improve LearningPacer by sharing your thoughts, reporting bugs, or suggesting features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={feedbackCategory} onValueChange={setFeedbackCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="platform">Platform</SelectItem>
              <SelectItem value="course">Course Content</SelectItem>
              <SelectItem value="bug">Bug Report</SelectItem>
              <SelectItem value="feature">Feature Request</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Brief title for your feedback"
            value={feedbackTitle}
            onChange={(e) => setFeedbackTitle(e.target.value)}
          />
          <Textarea
            placeholder="Describe your feedback in detail..."
            value={feedbackContent}
            onChange={(e) => setFeedbackContent(e.target.value)}
            rows={4}
          />
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="anonymous-feedback"
              checked={feedbackAnonymous}
              onCheckedChange={(checked) => setFeedbackAnonymous(checked === true)}
            />
            <label 
              htmlFor="anonymous-feedback" 
              className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer"
            >
              <EyeOff className="w-4 h-4" />
              Submit anonymously
            </label>
          </div>
          <Button onClick={submitFeedback} className="w-full gradient-primary">
            <Send className="w-4 h-4 mr-2" />
            Submit Feedback
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Recent Feedback</h3>
        {feedbacks.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-8 text-center text-muted-foreground">
              No feedback submitted yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {feedbacks.map((f, index) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="glass-card h-full transition-all hover:shadow-lg">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className={categoryColors[f.category]}>
                            {f.category}
                          </Badge>
                          <CardTitle className="text-base truncate">{f.title}</CardTitle>
                        </div>
                        <CardDescription>
                          {getDisplayName(f.user_email, f.content)} •{" "}
                          {formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}
                        </CardDescription>
                      </div>
                      {(f.user_id === user?.id || isAdmin) && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => deleteFeedback(f.id)}
                          className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap line-clamp-3">{getCleanContent(f.content)}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {isMobile ? (
        <>
          <MobileNav />
          <AnimatePresence mode="wait">
            {activeSection === 'announcements' && <AnnouncementsSection key="announcements" />}
            {activeSection === 'discussions' && <DiscussionsSection key="discussions" />}
            {activeSection === 'feedback' && <FeedbackSection key="feedback" />}
          </AnimatePresence>
        </>
      ) : (
        <div className="flex gap-6">
          {/* Vertical Sidebar Navigation */}
          <div className="w-56 shrink-0 space-y-2">
            <Card className="glass-card sticky top-4">
              <CardContent className="p-3 space-y-1">
                <NavItem 
                  icon={Megaphone} 
                  label="Announcements" 
                  section="announcements"
                />
                <NavItem 
                  icon={MessageCircle} 
                  label="Discussions" 
                  section="discussions"
                />
                <NavItem 
                  icon={Send} 
                  label="Feedback" 
                  section="feedback"
                />
              </CardContent>
            </Card>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {activeSection === 'announcements' && <AnnouncementsSection key="announcements" />}
              {activeSection === 'discussions' && <DiscussionsSection key="discussions" />}
              {activeSection === 'feedback' && <FeedbackSection key="feedback" />}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};

export default Community;
