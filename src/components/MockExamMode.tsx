import { useEffect, useState } from "react";
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Loader2,
  RotateCcw,
  Target,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { requestMockExam } from "@/services/mockExamApi";
import { persistMockExamSession } from "@/services/mockExamSessionStore";
import { LECTURE_TOPICS } from "@/data/examTopics";
import type {
  MockExamDifficulty,
  MockExamMode as ExamMode,
  MockExamNormalizedResponse,
  MockExamRunnerQuestion as Question,
} from "@/types/mockExam";

interface UserAnswer {
  questionId: number;
  answer: string;
  isCorrect: boolean;
  pointsEarned: number;
}

const MockExamMode = () => {
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Map<number, string>>(new Map());
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<UserAnswer[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [scoredPoints, setScoredPoints] = useState(0);
  const [error, setError] = useState<string>("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastResponse, setLastResponse] = useState<MockExamNormalizedResponse | null>(null);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);

  const courseName = "Computer Networks";
  const [examMode, setExamMode] = useState<ExamMode>("exam_simulation");
  const [numMCQ, setNumMCQ] = useState("10");
  const [numOpenEnded, setNumOpenEnded] = useState("5");
  const [difficulty, setDifficulty] = useState<MockExamDifficulty>("medium");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([...LECTURE_TOPICS]);

  const totalLectures = LECTURE_TOPICS.length;
  const selectedCount = selectedTopics.length;
  const allSelected = selectedCount === totalLectures;
  const noneSelected = selectedCount === 0;
  const examStarted = questions.length > 0 && !showResults;
  const pdfLink = lastResponse?.pdf.link ?? null;
  const downloadLink = lastResponse?.pdf.downloadLink ?? null;

  const { toast } = useToast();

  useEffect(() => {
    if (!isLoadingQuestions) {
      setElapsedTime(0);
      return;
    }

    const start = Date.now();
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - start);
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoadingQuestions]);

  const resetPracticeState = () => {
    setQuestions([]);
    setCurrentQuestion(0);
    setUserAnswers(new Map());
    setResults([]);
    setShowResults(false);
    setScoredPoints(0);
    setTotalPoints(0);
  };

  const validateAnswer = (question: Question, userAnswer: string): boolean => {
    return userAnswer === question.correctAnswer?.toString();
  };

  const startQuickPractice = (practiceQuestions: Question[]) => {
    setQuestions(practiceQuestions);
    setCurrentQuestion(0);
    setUserAnswers(new Map());
    setResults([]);
    setShowResults(false);
    setScoredPoints(0);
    setTotalPoints(practiceQuestions.reduce((sum, q) => sum + q.points, 0));
  };

  const fetchExamQuestions = async () => {
    if (selectedTopics.length === 0) {
      toast({
        title: "No lectures selected",
        description: "Please select at least one lecture to generate an exam.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingQuestions(true);
    setError("");
    setSavedSessionId(null);
    resetPracticeState();

    try {
      const includeTopics = allSelected ? [] : selectedTopics;
      const requestPayload = {
        mode: examMode,
        topic: courseName,
        numMultipleChoice: parseInt(numMCQ),
        numOpenEnded: parseInt(numOpenEnded),
        difficulty,
        includeTopics,
        excludeTopics: [],
        sessionId: `exam-${Date.now()}`,
      } as const;

      const response = await requestMockExam(requestPayload);

      console.log("[MockExam] normalized response:", response);
      setLastResponse(response);

      const persistenceResult = await persistMockExamSession(requestPayload, response);
      if (persistenceResult.status === "saved" && persistenceResult.sessionId) {
        setSavedSessionId(persistenceResult.sessionId);
      } else if (persistenceResult.status === "failed") {
        console.error("[MockExam] Failed to save generated exam session:", persistenceResult.reason);
      }

      if (examMode === "quick_practice" && response.practiceQuestions.length > 0) {
        startQuickPractice(response.practiceQuestions);
        toast({
          title: "Quick Practice Ready",
          description: `${response.practiceQuestions.length} in-app MCQs are ready to answer.`,
        });
        return;
      }

      if (!response.pdf.link && !response.structured) {
        throw new Error("Workflow returned neither structured questions nor a PDF link.");
      }

      if (examMode === "quick_practice" && !response.structured) {
        toast({
          title: "Workflow still PDF-first",
          description: "Quick Practice is ready in the app, but your n8n workflow still returns only a PDF link today.",
        });
      } else if (response.structured) {
        toast({
          title: "Structured exam data received",
          description: "The app detected structured exam JSON and is ready for the upgraded workflow.",
        });
      } else {
        toast({
          title: "Exam Generated",
          description: "Your exam simulation PDF is ready to view or download.",
        });
      }
    } catch (err: any) {
      console.error("Failed to generate exam:", err);
      const errorMessage = err.message || "Failed to generate exam. Please try again.";
      setError(errorMessage);

      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleAnswerChange = (value: string) => {
    const nextAnswers = new Map(userAnswers);
    nextAnswers.set(currentQuestion, value);
    setUserAnswers(nextAnswers);
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

    const nextResults = [...results, newResult];
    setResults(nextResults);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      return;
    }

    const finalScore = nextResults.reduce((sum, result) => sum + result.pointsEarned, 0);
    setScoredPoints(finalScore);
    setShowResults(true);
  };

  const handleRetakeExam = () => {
    resetPracticeState();
    setError("");
    setLastResponse(null);
    setSavedSessionId(null);
    setSelectedTopics([...LECTURE_TOPICS]);
  };

  const handleViewExam = () => {
    if (pdfLink) {
      window.open(pdfLink, "_blank", "noopener,noreferrer");
      return;
    }

    toast({
      title: "Cannot Open Exam",
      description: "The exam link is unavailable.",
      variant: "destructive",
    });
  };

  const handleDownloadExam = () => {
    if (downloadLink) {
      window.open(downloadLink, "_blank", "noopener,noreferrer");
      return;
    }

    toast({
      title: "Download Error",
      description: "The exam download link is unavailable.",
      variant: "destructive",
    });
  };

  if (showResults) {
    const percentage = totalPoints > 0 ? Math.round((scoredPoints / totalPoints) * 100) : 0;

    return (
      <div className="space-y-6">
        <Card className="glass-card shadow-lg border-2">
          <CardHeader className="text-center">
            <div className="w-20 h-20 rounded-full gradient-primary mx-auto mb-4 flex items-center justify-center shadow-glow">
              <Target className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-3xl">Quick Practice Complete</CardTitle>
            <CardDescription>Structured in-app scoring is now working for MCQ-based quick practice.</CardDescription>
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

            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold">Review</h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {results.map((result, index) => {
                  const question = questions[index];
                  const correctOption =
                    typeof question.correctAnswer === "number"
                      ? question.options[question.correctAnswer]
                      : question.correctAnswerText;

                  return (
                    <div
                      key={question.id}
                      className={cn(
                        "p-4 rounded-lg border-2",
                        result.isCorrect
                          ? "border-primary/50 bg-primary/5"
                          : "border-destructive/50 bg-destructive/5",
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                          {question.topic}
                        </Badge>
                        <Badge variant={result.isCorrect ? "default" : "destructive"}>
                          {result.isCorrect ? "Correct" : "Incorrect"}
                        </Badge>
                      </div>
                      <p className="font-medium mb-2">{question.question}</p>
                      <div className="space-y-1 text-sm">
                        <p className="text-muted-foreground">
                          Your answer: <span className="font-medium">{result.answer}</span>
                        </p>
                        {!result.isCorrect && (
                          <p className="text-muted-foreground">
                            Correct answer: <span className="font-medium text-primary">{correctOption}</span>
                          </p>
                        )}
                        {question.explanation && (
                          <p className="text-muted-foreground">
                            Explanation: <span className="font-medium">{question.explanation}</span>
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
              Start Another Practice Session
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (examStarted) {
    const question = questions[currentQuestion];
    const currentAnswer = userAnswers.get(currentQuestion) || "";

    return (
      <div className="space-y-6">
        <Card className="glass-card shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{question.topic}</Badge>
                  <Badge variant={question.difficulty === "hard" ? "destructive" : question.difficulty === "easy" ? "default" : "secondary"}>
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
            <RadioGroup value={currentAnswer} onValueChange={handleAnswerChange}>
              <div className="space-y-3">
                {question.options.map((option, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-start space-x-3 p-4 rounded-lg border-2 transition-smooth cursor-pointer",
                      currentAnswer === idx.toString()
                        ? "border-primary bg-primary/5 shadow-glow"
                        : "border-border hover:border-primary/50",
                    )}
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

            <Button
              onClick={handleSubmitAnswer}
              disabled={!currentAnswer}
              className="w-full gradient-primary shadow-glow"
            >
              {currentQuestion < questions.length - 1 ? "Next Question" : "Finish Quick Practice"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(pdfLink || lastResponse?.structured) && (
        <Card className="glass-card shadow-lg border-2 border-primary/50">
          <CardHeader>
            <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl text-center">
              {examMode === "quick_practice" ? "Quick Practice Response Received" : "Exam Simulation Generated"}
            </CardTitle>
            <CardDescription className="text-center">
              {lastResponse?.structured
                ? "The app detected structured exam JSON and is ready for the upgraded workflow."
                : "Your current n8n workflow is still returning the legacy PDF-only format."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/50">
                <div>
                  <p className="font-medium">
                    {courseName} - {examMode === "quick_practice" ? "Quick Practice" : "Exam Simulation"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {numMCQ} MCQs, {numOpenEnded} Open-ended • {difficulty} difficulty
                  </p>
                  {lastResponse?.structured && (
                    <p className="text-sm text-primary mt-1">
                      Structured payload: {lastResponse.structured.mcqs.length} MCQs,{" "}
                      {lastResponse.structured.longForm.length} long-form questions
                    </p>
                  )}
                  {savedSessionId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Saved to exam history: <span className="font-mono">{savedSessionId}</span>
                    </p>
                  )}
                </div>
                {pdfLink && (
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
                )}
              </div>

              {!allSelected && (
                <div className="p-3 border rounded-lg bg-secondary/30 text-sm">
                  <p>
                    <span className="font-medium text-primary">Selected lectures:</span>{" "}
                    {selectedTopics.map((topic) => topic.replace(/Lecture (\d+):/, "L$1:")).join(", ")}
                  </p>
                </div>
              )}
            </div>

            <Button variant="outline" className="w-full" onClick={() => setLastResponse(null)}>
              Clear Last Response
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="glass-card shadow-lg border-2">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            Mock Exam Studio
          </CardTitle>
          <CardDescription>
            The app is now ready for both the legacy PDF workflow and the upgraded structured exam workflow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 p-4 border rounded-lg bg-secondary/20">
            <h3 className="font-semibold text-lg">Customize Your Exam</h3>

            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Mode</h4>
                <Badge variant="outline">
                  {examMode === "quick_practice" ? "In-app drill" : "PDF-first simulation"}
                </Badge>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setExamMode("quick_practice")}
                  disabled={isLoadingQuestions}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-colors",
                    examMode === "quick_practice"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background/60 hover:border-primary/40",
                  )}
                >
                  <p className="font-medium">Quick Practice</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Best for fast in-app MCQ drills once the workflow returns structured JSON.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setExamMode("exam_simulation")}
                  disabled={isLoadingQuestions}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-colors",
                    examMode === "exam_simulation"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background/60 hover:border-primary/40",
                  )}
                >
                  <p className="font-medium">Exam Simulation</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Best for the current workflow. Uses PDF fallback while we upgrade the generator.
                  </p>
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Lecture Topics</h4>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTopics([...LECTURE_TOPICS])}
                    disabled={isLoadingQuestions || allSelected}
                    className="text-xs h-7"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTopics([])}
                    disabled={isLoadingQuestions || noneSelected}
                    className="text-xs h-7"
                  >
                    Clear All
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Check the lectures you want to include in your exam.
              </p>

              <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-background/50">
                {LECTURE_TOPICS.map((lecture) => {
                  const isSelected = selectedTopics.includes(lecture);
                  const shortName = lecture.replace(/Lecture (\d+):/, "L$1:");

                  return (
                    <label
                      key={lecture}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors text-sm",
                        "hover:bg-secondary/50",
                        isSelected && "bg-primary/10",
                        isLoadingQuestions && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTopics([...selectedTopics, lecture]);
                          } else {
                            setSelectedTopics(selectedTopics.filter((topic) => topic !== lecture));
                          }
                        }}
                        disabled={isLoadingQuestions}
                      />
                      <span className={cn("truncate", !isSelected && "text-muted-foreground")}>
                        {shortName}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="h-4 w-4" />
                <span>
                  {allSelected ? (
                    <span className="text-primary font-medium">All {totalLectures} lectures selected</span>
                  ) : noneSelected ? (
                    <span className="text-destructive">No lectures selected - please select at least one</span>
                  ) : (
                    <span>
                      <strong>{selectedCount}</strong> of {totalLectures} lectures selected
                    </span>
                  )}
                </span>
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
              <RadioGroup value={difficulty} onValueChange={(value) => setDifficulty(value as MockExamDifficulty)} disabled={isLoadingQuestions}>
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
                <h3 className="font-semibold mb-1">State-Aware Frontend</h3>
                <p className="text-sm text-muted-foreground">
                  The app now detects legacy PDF responses and future structured exam JSON separately.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <FileText className="w-5 h-5 text-primary mt-1" />
              <div>
                <h3 className="font-semibold mb-1">PDF Fallback Preserved</h3>
                <p className="text-sm text-muted-foreground">
                  Exam Simulation still works with your current n8n workflow while we upgrade it.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Brain className="w-5 h-5 text-primary mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Quick Practice Ready</h3>
                <p className="text-sm text-muted-foreground">
                  Once the workflow returns structured MCQs, the in-app runner can start immediately.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-primary mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Workflow Gaps Still Matter</h3>
                <p className="text-sm text-muted-foreground">
                  The current n8n flow still has the old 3-archetype, single-shot, answer-key-in-PDF limitations.
                </p>
              </div>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Current workflow reality: the <code>Post Links1</code> to <code>Return Link1</code> path means your n8n
              generator still returns a PDF link only. The app-side contract is now ready for the upgraded workflow,
              but the state-of-the-art generator gaps are not fixed yet. We still need to improve archetypes,
              difficulty calibration, verification, student context, and PDF answer-key behavior inside n8n.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={fetchExamQuestions} className="ml-4">
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {isLoadingQuestions ? (
            <div className="py-8 text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
              <div className="space-y-3">
                <p className="font-medium">Generating your personalized exam...</p>
                <p className="text-sm text-muted-foreground">
                  This typically takes 30-60 seconds
                </p>
                <p className="text-xs text-muted-foreground">
                  Elapsed: {Math.floor(elapsedTime / 1000)}s
                </p>
              </div>
            </div>
          ) : (
            <Button
              onClick={fetchExamQuestions}
              disabled={noneSelected}
              className="w-full gradient-primary shadow-glow text-lg py-6"
            >
              <FileText className="w-5 h-5 mr-2" />
              {examMode === "quick_practice" ? "Generate Quick Practice" : "Generate Exam Simulation"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MockExamMode;
