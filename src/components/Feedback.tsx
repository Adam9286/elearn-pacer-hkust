import { useState, useEffect } from "react";
import { Send, Trash2, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { externalSupabase } from "@/lib/externalSupabase";
import { useUserProgress } from "@/contexts/UserProgressContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

interface FeedbackItem {
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

const Feedback = () => {
  const { user, isAdmin } = useUserProgress();
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackCategory, setFeedbackCategory] = useState<string>("");
  const [feedbackAnonymous, setFeedbackAnonymous] = useState(false);

  // Helper functions for anonymous posting
  const isAnonymousPost = (content: string) => content.startsWith('[ANON]');
  const getCleanContent = (content: string) =>
    isAnonymousPost(content) ? content.replace('[ANON]', '') : content;
  const getDisplayName = (email: string | undefined, content: string) => {
    if (isAnonymousPost(content)) return "Anonymous";
    return email?.split("@")[0] || "User";
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    setLoading(true);
    const { data, error } = await externalSupabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setFeedbacks(data);
    setLoading(false);
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

  const deleteFeedback = async (id: string) => {
    const { error } = await externalSupabase.from("feedback").delete().eq("id", id);
    if (!error) {
      toast.success("Feedback deleted");
      fetchFeedbacks();
    } else {
      toast.error("Failed to delete feedback");
    }
  };

  // Not logged in state
  if (!user) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Send className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Sign in to submit feedback</h3>
          <p className="text-muted-foreground text-center">
            Help us improve LearningPacer by sharing your thoughts, reporting bugs, or suggesting features.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="glass-card animate-pulse">
            <CardContent className="h-32" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Submit Feedback Form */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Help Us Improve
          </CardTitle>
          <CardDescription>
            Share your thoughts, report bugs, or suggest features. Your feedback directly shapes LearningPacer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={feedbackCategory} onValueChange={setFeedbackCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="platform">Platform Issue</SelectItem>
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
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <Checkbox
                checked={feedbackAnonymous}
                onCheckedChange={(checked) => setFeedbackAnonymous(checked as boolean)}
              />
              <EyeOff className="w-4 h-4" />
              Post anonymously
            </label>
            <Button onClick={submitFeedback} className="gradient-primary">
              <Send className="w-4 h-4 mr-2" />
              Submit Feedback
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Feedback */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Recent Feedback</h3>
        {feedbacks.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-8 text-center text-muted-foreground">
              No feedback yet. Be the first to share your thoughts!
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {feedbacks.map((f, index) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="glass-card hover:shadow-lg transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={categoryColors[f.category] || categoryColors.other}
                          >
                            {f.category}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            by {getDisplayName(f.user_email, f.content)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • {formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <h4 className="font-medium mb-1">{f.title}</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {getCleanContent(f.content)}
                        </p>
                      </div>
                      {(user.id === f.user_id || isAdmin) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteFeedback(f.id)}
                          className="shrink-0"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Feedback;
