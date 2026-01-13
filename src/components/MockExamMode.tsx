import { useState, useEffect } from "react";
import {
  Brain,
  Clock,
  Target,
  Play,
  RotateCcw,
  Loader2,
  AlertCircle,
  FileText,
  CheckCircle2,
  Download,
  X,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { externalSupabase } from "@/lib/externalSupabase";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { WEBHOOKS } from "@/constants/api";
import { LECTURE_TOPICS } from "@/data/examTopics";

interface Question {
  id: number;
  type: "mcq" | "short_answer" | "calculation";
  question: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  options?: string[];
  correctAnswer?: number;
  correctAnswerText?: string;
  acceptableAnswers?: string[];
  points: number;
}

interface UserAnswer {
  questionId: number;
  answer: string;
  isCorrect: boolean;
  pointsEarned: number;
}

const MockExamMode = () => {
  const [examStarted, setExamStarted] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Map<number, string>>(new Map());
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<UserAnswer[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [scoredPoints, setScoredPoints] = useState(0);
  const [error, setError] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [examLink, setExamLink] = useState<string | null>(null);
  const [downloadLink, setDownloadLink] = useState<string | null>(null);

  // Exam customization state
  // Course is fixed - not editable by users
  const courseName = "Computer Networks";
  const [numMCQ, setNumMCQ] = useState("10");
  const [numOpenEnded, setNumOpenEnded] = useState("5");
  const [difficulty, setDifficulty] = useState("medium");
  const [includeTopics, setIncludeTopics] = useState<string[]>([]);
  const [excludeTopics, setExcludeTopics] = useState<string[]>([]);

  const { toast } = useToast();

  // Progress indicator during loading
  useEffect(() => {
    if (isLoadingQuestions) {
      const interval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 5, 95));
      }, 2000);
      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [isLoadingQuestions]);

  const validateAnswer = (question: Question, userAnswer: string): boolean => {
    if (question.type === "mcq") {
      return userAnswer === question.correctAnswer?.toString();
    }

    if (question.type === "short_answer") {
      const normalized = userAnswer.trim().toLowerCase();
      const correctNormalized = question.correctAnswerText?.toLowerCase() || "";

      // Check exact match or acceptable answers
      if (normalized === correctNormalized) return true;

      return question.acceptableAnswers?.some((ans) => ans.toLowerCase().trim() === normalized) || false;
    }

    if (question.type === "calculation") {
      // Extract numbers from the answer
      const userNum = parseFloat(userAnswer.replace(/[^0-9.-]/g, ""));
      const correctNum = parseFloat(question.correctAnswerText || "");

      if (isNaN(userNum) || isNaN(correctNum)) return false;

      // Allow small tolerance for rounding
      return Math.abs(userNum - correctNum) < 0.01;
    }

    return false;
  };

  const fetchExamQuestions = async () => {
    setIsLoadingQuestions(true);
    setError("");
    setProgress(0);

    try {
      // Call n8n webhook directly (bypasses edge functions)
      const response = await fetch(WEBHOOKS.EXAM_GENERATOR, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: courseName,
          numMultipleChoice: parseInt(numMCQ),
          numOpenEnded: parseInt(numOpenEnded),
          difficulty: difficulty,
          includeTopics: includeTopics,
          excludeTopics: excludeTopics,
          sessionId: `exam-${Date.now()}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Failed to generate exam (${response.status})`);
      }

      // Check for empty response body
      const responseText = await response.text();
      if (!responseText || responseText.trim() === "") {
        throw new Error(
          "n8n webhook returned empty response. Make sure the workflow is active (not in test mode) and the 'Respond to Webhook' node is configured correctly.",
        );
      }

      // Parse JSON response containing Google Drive link
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("[GenerateExam] Failed to parse response:", responseText);
        throw new Error(`Invalid JSON response from n8n: ${responseText.substring(0, 100)}`);
      }
      console.log("[GenerateExam] response JSON:", result);

      // Robust validation and fallback logic
      let link = result?.link?.trim();
      let download = result?.downloadLink?.trim();
      const fileId = result?.fileId?.trim();

      // Validate link
      if (!link || !link.startsWith("http")) {
        // Try to build from fileId
        if (fileId && fileId.length > 5) {
          link = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
        }
      }

      // Validate download link
      if (!download || !download.startsWith("http")) {
        // Try to build from fileId
        if (fileId && fileId.length > 5) {
          download = `https://drive.google.com/uc?export=download&id=${fileId}`;
        }
      }

      // Final validation
      if (!link || !link.startsWith("http")) {
        console.error("[GenerateExam] Invalid or missing link:", result);
        toast({
          title: "Link Unavailable",
          description: "The exam file link could not be retrieved. Please try again or regenerate the exam.",
          variant: "destructive",
        });
        return;
      }

      setProgress(100);
      setExamLink(link);
      setDownloadLink(download || null);

      toast({
        title: "Exam Generated!",
        description: "Your mock exam is ready to view or download.",
      });
    } catch (error: any) {
      console.error("Failed to generate exam:", error);
      const errorMessage = error.message || "Failed to generate exam. Please try again.";
      setError(errorMessage);

      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoadingQuestions(false);
      setProgress(0);
    }
  };

  const handleStartExam = () => {
    fetchExamQuestions();
  };

  const handleAnswerChange = (value: string) => {
    const newAnswers = new Map(userAnswers);
    newAnswers.set(currentQuestion, value);
    setUserAnswers(newAnswers);
  };

  const handleSubmitAnswer = () => {
    const question = questions[currentQuestion];
    const userAnswer = userAnswers.get(currentQuestion) || "";
    const isCorrect = validateAnswer(question, userAnswer);
    const pointsEarned = isCorrect ? question.points : 0;

    const newResult: UserAnswer = {
      questionId: question.id,
      answer: userAnswer,
      isCorrect,
      pointsEarned,
    };

    setResults([...results, newResult]);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate final score
      const finalScore = [...results, newResult].reduce((sum, r) => sum + r.pointsEarned, 0);
      setScoredPoints(finalScore);
      setShowResults(true);
      setExamStarted(false);
    }
  };

  const handleRetakeExam = () => {
    setExamStarted(false);
    setShowResults(false);
    setCurrentQuestion(0);
    setUserAnswers(new Map());
    setResults([]);
    setScoredPoints(0);
    setQuestions([]);
    setError("");
    setExamLink(null);
    setDownloadLink(null);
    setIncludeTopics([]);
    setExcludeTopics([]);
  };

  const handleViewExam = () => {
    const link = examLink?.trim();
    if (link && link.startsWith("http")) {
      window.open(link, "_blank", "noopener,noreferrer");
    } else {
      console.error("Invalid or missing exam link:", link);
      toast({
        title: "Cannot Open Exam",
        description: "The exam link is invalid or unavailable.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadExam = () => {
    // Prefer downloadLink if available
    let link = downloadLink?.trim();

    if (!link || !link.startsWith("http")) {
      // Fallback: try to derive from examLink
      const viewLink = examLink?.trim();
      if (viewLink && viewLink.startsWith("http")) {
        const fileIdMatch = viewLink.match(/\/d\/([^\/]+)/);
        const fileId = fileIdMatch ? fileIdMatch[1] : null;

        if (fileId) {
          link = `https://drive.google.com/uc?export=download&id=${fileId}`;
        }
      }
    }

    if (link && link.startsWith("http")) {
      window.open(link, "_blank", "noopener,noreferrer");
    } else {
      console.error("Invalid or missing download link:", { downloadLink, examLink });
      toast({
        title: "Download Error",
        description: "Unable to generate download link. Please try viewing the exam instead.",
        variant: "destructive",
      });
    }
  };

  const getPerformanceByType = () => {
    const byType: Record<string, { correct: number; total: number }> = {};

    results.forEach((result, idx) => {
      const question = questions[idx];
      if (!byType[question.type]) {
        byType[question.type] = { correct: 0, total: 0 };
      }
      byType[question.type].total += 1;
      if (result.isCorrect) {
        byType[question.type].correct += 1;
      }
    });

    return byType;
  };

  if (showResults) {
    const performanceByType = getPerformanceByType();
    const percentage = Math.round((scoredPoints / totalPoints) * 100);

    return (
      <div className="space-y-6">
        <Card className="glass-card shadow-lg border-2">
          <CardHeader className="text-center">
            <div className="w-20 h-20 rounded-full gradient-primary mx-auto mb-4 flex items-center justify-center shadow-glow">
              <Target className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-3xl">Exam Complete!</CardTitle>
            <CardDescription>Here's how you performed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-6xl font-bold text-primary mb-2">{percentage}%</div>
              <p className="text-muted-foreground">
                {scoredPoints} out of {totalPoints} points
              </p>
            </div>
            <Progress value={percentage} className="h-3" />

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center p-4 rounded-lg bg-secondary">
                <div className="text-2xl font-bold text-primary">{results.filter((r) => r.isCorrect).length}</div>
                <p className="text-sm text-muted-foreground">Correct</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-secondary">
                <div className="text-2xl font-bold text-destructive">{results.filter((r) => !r.isCorrect).length}</div>
                <p className="text-sm text-muted-foreground">Incorrect</p>
              </div>
            </div>

            {/* Performance by question type */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-sm text-muted-foreground">Performance by Type</h3>
              {Object.entries(performanceByType).map(([type, stats]) => (
                <div key={type} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <span className="capitalize text-sm font-medium">{type.replace("_", " ")}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {stats.correct}/{stats.total}
                    </span>
                    <Badge variant={stats.correct / stats.total >= 0.7 ? "default" : "destructive"}>
                      {Math.round((stats.correct / stats.total) * 100)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Question Review */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold">Question Review</h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {results.map((result, idx) => {
                  const question = questions[idx];
                  return (
                    <div
                      key={question.id}
                      className={`p-4 rounded-lg border-2 ${
                        result.isCorrect ? "border-primary/50 bg-primary/5" : "border-destructive/50 bg-destructive/5"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                          {question.topic}
                        </Badge>
                        <Badge variant={result.isCorrect ? "default" : "destructive"}>
                          {result.isCorrect ? "✓ Correct" : "✗ Incorrect"}
                        </Badge>
                      </div>
                      <p className="font-medium mb-2">{question.question}</p>
                      <div className="space-y-1 text-sm">
                        <p className="text-muted-foreground">
                          Your answer: <span className="font-medium">{result.answer}</span>
                        </p>
                        {!result.isCorrect && (
                          <p className="text-muted-foreground">
                            Correct answer:{" "}
                            <span className="font-medium text-primary">
                              {question.type === "mcq"
                                ? question.options?.[question.correctAnswer || 0]
                                : question.correctAnswerText}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Button onClick={handleRetakeExam} className="w-full gradient-primary shadow-glow">
              <RotateCcw className="w-4 h-4 mr-2" />
              Retake Exam
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!examStarted) {
    return (
      <div className="space-y-6">
        {/* Success Card - Exam Generated */}
        {examLink && (
          <Card className="glass-card shadow-lg border-2 border-primary/50">
            <CardHeader>
              <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl text-center">Exam Generated Successfully!</CardTitle>
              <CardDescription className="text-center">Your personalized mock exam is ready</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/50">
                  <div>
                    <p className="font-medium">{courseName} - Mock Exam</p>
                    <p className="text-sm text-muted-foreground">
                      {numMCQ} MCQs, {numOpenEnded} Open-ended • {difficulty} difficulty
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleViewExam}>
                      <FileText className="h-4 w-4 mr-2" />
                      View Exam
                    </Button>
                    <Button variant="default" size="sm" onClick={handleDownloadExam}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>

                {(includeTopics.length > 0 || excludeTopics.length > 0) && (
                  <div className="p-3 border rounded-lg bg-secondary/30 text-sm">
                    {includeTopics.length > 0 && (
                      <p className="mb-1">
                        <span className="font-medium text-primary">Included:</span> {includeTopics.join(", ")}
                      </p>
                    )}
                    {excludeTopics.length > 0 && (
                      <p>
                        <span className="font-medium text-destructive">Excluded:</span> {excludeTopics.join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <Button variant="outline" className="w-full" onClick={() => setExamLink(null)}>
                Generate Another Exam
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="glass-card shadow-lg border-2">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary" />
              AI-Generated Mock Exam
            </CardTitle>
            <CardDescription>Personalized practice tests generated from your course material</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Exam Customization */}
            <div className="space-y-4 p-4 border rounded-lg bg-secondary/20">
              <h3 className="font-semibold text-lg">Customize Your Exam</h3>

              {/* Lecture Selection Section */}
              <div className="space-y-3 pt-2 border-t">
                <h4 className="font-semibold text-sm">Lecture Selection</h4>
                <div>
                  <Label>Lecture Topics (PDFs)</Label>
                  <div className="space-y-2 mt-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          disabled={isLoadingQuestions}
                          className="w-full justify-between"
                        >
                          Select lectures to include/exclude
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search lectures..." />
                          <CommandList>
                            <CommandEmpty>No lecture found.</CommandEmpty>
                            <CommandGroup>
                              {LECTURE_TOPICS.map((lecture) => {
                                const isIncluded = includeTopics.includes(lecture);
                                const isExcluded = excludeTopics.includes(lecture);

                                return (
                                  <CommandItem
                                    key={lecture}
                                    onSelect={() => {
                                      if (isIncluded) {
                                        setIncludeTopics(includeTopics.filter((t) => t !== lecture));
                                        setExcludeTopics([...excludeTopics, lecture]);
                                      } else if (isExcluded) {
                                        setExcludeTopics(excludeTopics.filter((t) => t !== lecture));
                                      } else {
                                        setIncludeTopics([...includeTopics, lecture]);
                                      }
                                    }}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span>{lecture}</span>
                                      {isIncluded && (
                                        <Badge variant="secondary" className="ml-2">
                                          <Check className="h-3 w-3" />
                                        </Badge>
                                      )}
                                      {isExcluded && (
                                        <Badge variant="destructive" className="ml-2">
                                          <X className="h-3 w-3" />
                                        </Badge>
                                      )}
                                    </div>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {/* Display selected topics as badges */}
                    {includeTopics.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Included:</p>
                        <div className="flex flex-wrap gap-1">
                          {includeTopics.map((topic) => (
                            <Badge key={topic} variant="secondary" className="text-xs">
                              {topic}
                              <button
                                onClick={() => setIncludeTopics(includeTopics.filter((t) => t !== topic))}
                                className="ml-1 hover:text-destructive"
                                disabled={isLoadingQuestions}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {excludeTopics.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Excluded:</p>
                        <div className="flex flex-wrap gap-1">
                          {excludeTopics.map((topic) => (
                            <Badge key={topic} variant="destructive" className="text-xs">
                              {topic}
                              <button
                                onClick={() => setExcludeTopics(excludeTopics.filter((t) => t !== topic))}
                                className="ml-1 hover:text-foreground"
                                disabled={isLoadingQuestions}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mcq">Multiple Choice Questions</Label>
                  <Select value={numMCQ} onValueChange={setNumMCQ} disabled={isLoadingQuestions}>
                    <SelectTrigger id="mcq">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 Questions</SelectItem>
                      <SelectItem value="10">10 Questions</SelectItem>
                      <SelectItem value="15">15 Questions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="open">Open-Ended Questions</Label>
                  <Select value={numOpenEnded} onValueChange={setNumOpenEnded} disabled={isLoadingQuestions}>
                    <SelectTrigger id="open">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 Questions</SelectItem>
                      <SelectItem value="5">5 Questions</SelectItem>
                      <SelectItem value="7">7 Questions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Difficulty Level</Label>
                <RadioGroup value={difficulty} onValueChange={setDifficulty} disabled={isLoadingQuestions}>
                  <div className="flex gap-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="easy" id="easy" />
                      <Label htmlFor="easy" className="font-normal cursor-pointer">
                        Easy
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="medium" />
                      <Label htmlFor="medium" className="font-normal cursor-pointer">
                        Medium
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="hard" id="hard" />
                      <Label htmlFor="hard" className="font-normal cursor-pointer">
                        Hard
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Personalized Questions</h3>
                  <p className="text-sm text-muted-foreground">
                    AI generates questions from your uploaded course materials
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Downloadable PDF</h3>
                  <p className="text-sm text-muted-foreground">Get your exam as a printable PDF document</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Brain className="w-5 h-5 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Multiple Question Types</h3>
                  <p className="text-sm text-muted-foreground">
                    MCQs and open-ended questions for comprehensive testing
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Ready in Minutes</h3>
                  <p className="text-sm text-muted-foreground">Your exam will be generated and ready to download</p>
                </div>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{error}</span>
                  <Button variant="outline" size="sm" onClick={handleStartExam} className="ml-4">
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {isLoadingQuestions ? (
              <div className="py-8 text-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm justify-center">
                    <span className="font-medium">Generating your personalized exam...</span>
                  </div>
                  <Progress value={progress} className="h-2 max-w-md mx-auto" />
                  <p className="text-xs text-muted-foreground">
                    {progress < 30 && "Analyzing your course material..."}
                    {progress >= 30 && progress < 60 && "Creating exam questions..."}
                    {progress >= 60 && progress < 90 && "Formatting PDF document..."}
                    {progress >= 90 && "Almost ready..."}
                  </p>
                  <p className="text-sm text-muted-foreground">This may take up to 2 minutes</p>
                </div>
              </div>
            ) : (
              <Button onClick={handleStartExam} className="w-full gradient-primary shadow-glow text-lg py-6">
                <FileText className="w-5 h-5 mr-2" />
                Generate & Download Exam PDF
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Exam In Progress
  const question = questions[currentQuestion];
  const currentAnswer = userAnswers.get(currentQuestion) || "";

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card className="glass-card shadow-lg">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{question.topic}</Badge>
                <Badge
                  variant={
                    question.difficulty === "easy"
                      ? "default"
                      : question.difficulty === "hard"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {question.difficulty}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Question {currentQuestion + 1} of {questions.length}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {Math.round(((currentQuestion + 1) / questions.length) * 100)}%
              </div>
              <p className="text-xs text-muted-foreground">Progress</p>
            </div>
          </div>
          <Progress value={((currentQuestion + 1) / questions.length) * 100} className="h-2" />
        </CardContent>
      </Card>

      {/* Question */}
      <Card className="glass-card shadow-lg border-2">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-xl leading-relaxed flex-1">{question.question}</CardTitle>
            <Badge variant="outline" className="ml-4">
              {question.points} pts
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* MCQ Questions */}
          {question.type === "mcq" && question.options && (
            <RadioGroup value={currentAnswer} onValueChange={handleAnswerChange}>
              <div className="space-y-3">
                {question.options.map((option, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-smooth cursor-pointer ${
                      currentAnswer === idx.toString()
                        ? "border-primary bg-primary/5 shadow-glow"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => handleAnswerChange(idx.toString())}
                  >
                    <RadioGroupItem value={idx.toString()} id={`option-${idx}`} className="mt-0.5" />
                    <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}

          {/* Short Answer Questions */}
          {question.type === "short_answer" && (
            <div className="space-y-2">
              <Label htmlFor="short-answer">Your Answer</Label>
              <Textarea
                id="short-answer"
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(e.target.value)}
                placeholder="Type your answer here..."
                className="min-h-32"
              />
              <p className="text-xs text-muted-foreground">{currentAnswer.length}/500 characters</p>
            </div>
          )}

          {/* Calculation Questions */}
          {question.type === "calculation" && (
            <div className="space-y-2">
              <Label htmlFor="calculation">Your Answer</Label>
              <Input
                id="calculation"
                type="text"
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(e.target.value)}
                placeholder="Enter your calculation (include units if applicable)"
              />
              <p className="text-xs text-muted-foreground">Include units in your answer if required</p>
            </div>
          )}

          <Button
            onClick={handleSubmitAnswer}
            disabled={!currentAnswer}
            className="w-full gradient-primary shadow-glow"
          >
            {currentQuestion < questions.length - 1 ? "Next Question" : "Finish Exam"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MockExamMode;
