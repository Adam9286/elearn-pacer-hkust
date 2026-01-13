import { useState, useEffect } from "react";
import { MessageSquare, Send, Megaphone, MessageCircle, Plus, ChevronDown, ChevronUp, Trash2, Pin, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { externalSupabase } from "@/lib/externalSupabase";
import { useUserProgress } from "@/contexts/UserProgressContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

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

const Community = () => {
  const { user, isAdmin } = useUserProgress();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDiscussion, setExpandedDiscussion] = useState<string | null>(null);

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
      // Fetch replies for each discussion
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

  return (
    <div className="space-y-6">
      <Tabs defaultValue="announcements" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="announcements" className="flex items-center gap-2">
            <Megaphone className="w-4 h-4" />
            Announcements
          </TabsTrigger>
          <TabsTrigger value="discussions" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Discussions
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Feedback
          </TabsTrigger>
        </TabsList>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="space-y-4">
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
            announcements.map((a) => (
              <Card key={a.id} className={`glass-card ${a.pinned ? "border-accent/50" : ""}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {a.pinned && <Pin className="w-4 h-4 text-accent" />}
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
            ))
          )}
        </TabsContent>

        {/* Discussions Tab */}
        <TabsContent value="discussions" className="space-y-4">
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
            discussions.map((d) => (
              <Card key={d.id} className="glass-card">
                <Collapsible
                  open={expandedDiscussion === d.id}
                  onOpenChange={() => setExpandedDiscussion(expandedDiscussion === d.id ? null : d.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{d.title}</CardTitle>
                        <CardDescription>
                          {getDisplayName(d.user_email, d.content)} •{" "}
                          {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {d.user_id === user?.id && (
                          <Button variant="ghost" size="icon" onClick={() => deleteDiscussion(d.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MessageCircle className="w-4 h-4 mr-1" />
                            {d.replies?.length || 0}
                            {expandedDiscussion === d.id ? (
                              <ChevronUp className="w-4 h-4 ml-1" />
                            ) : (
                              <ChevronDown className="w-4 h-4 ml-1" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap mb-4">{getCleanContent(d.content)}</p>
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
            ))
          )}
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-6">
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
              feedbacks.map((f) => (
                <Card key={f.id} className="glass-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={categoryColors[f.category]}>
                            {f.category}
                          </Badge>
                          <CardTitle className="text-base">{f.title}</CardTitle>
                        </div>
                        <CardDescription>
                          {getDisplayName(f.user_email, f.content)} •{" "}
                          {formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{getCleanContent(f.content)}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Community;
