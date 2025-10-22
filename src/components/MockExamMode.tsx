import { useState } from "react";
import { Brain, Clock, Target, Play, RotateCcw, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const validateAnswer = (question: Question, userAnswer: string): boolean => {
    if (question.type === "mcq") {
      return userAnswer === question.correctAnswer?.toString();
    }
    
    if (question.type === "short_answer") {
      const normalized = userAnswer.trim().toLowerCase();
      const correctNormalized = question.correctAnswerText?.toLowerCase() || "";
      
      // Check exact match or acceptable answers
      if (normalized === correctNormalized) return true;
      
      return question.acceptableAnswers?.some(ans => 
        ans.toLowerCase().trim() === normalized
      ) || false;
    }
    
    if (question.type === "calculation") {
      // Extract numbers from the answer
      const userNum = parseFloat(userAnswer.replace(/[^0-9.-]/g, ''));
      const correctNum = parseFloat(question.correctAnswerText || '');
      
      if (isNaN(userNum) || isNaN(correctNum)) return false;
      
      // Allow small tolerance for rounding
      return Math.abs(userNum - correctNum) < 0.01;
    }
    
    return false;
  };

  const fetchExamQuestions = async () => {
    setIsLoadingQuestions(true);
    setError("");
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-exam', {
        body: {
          numQuestions: 15,
          difficulty: "mixed",
          includeTypes: ["mcq", "short_answer", "calculation"]
        }
      });
      
      if (error) throw error;
      
      if (!data?.questions || data.questions.length === 0) {
        throw new Error("No questions received from the server");
      }
      
      setQuestions(data.questions);
      const total = data.questions.reduce((sum: number, q: Question) => sum + q.points, 0);
      setTotalPoints(total);
      setExamStarted(true);
      
      toast({
        title: "Exam Ready!",
        description: `Generated ${data.questions.length} questions tailored for you.`,
      });
    } catch (error: any) {
      console.error("Failed to generate exam:", error);
      setError(error.message || "Failed to generate exam. Please try again.");
      
      toast({
        title: "Error",
        description: "Failed to generate exam questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingQuestions(false);
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
              <div className="text-6xl font-bold text-primary mb-2">
                {percentage}%
              </div>
              <p className="text-muted-foreground">
                {scoredPoints} out of {totalPoints} points
              </p>
            </div>
            <Progress value={percentage} className="h-3" />
            
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center p-4 rounded-lg bg-secondary">
                <div className="text-2xl font-bold text-primary">
                  {results.filter(r => r.isCorrect).length}
                </div>
                <p className="text-sm text-muted-foreground">Correct</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-secondary">
                <div className="text-2xl font-bold text-destructive">
                  {results.filter(r => !r.isCorrect).length}
                </div>
                <p className="text-sm text-muted-foreground">Incorrect</p>
              </div>
            </div>

            {/* Performance by question type */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-sm text-muted-foreground">Performance by Type</h3>
              {Object.entries(performanceByType).map(([type, stats]) => (
                <div key={type} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <span className="capitalize text-sm font-medium">{type.replace('_', ' ')}</span>
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
        <Card className="glass-card shadow-lg border-2">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary" />
              AI-Generated Mock Exam
            </CardTitle>
            <CardDescription>
              Personalized practice tests generated from your course material
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-6 rounded-xl bg-primary/5 border border-primary/20 text-center">
                <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">20 min</div>
                <p className="text-sm text-muted-foreground">Estimated Time</p>
              </div>
              <div className="p-6 rounded-xl bg-accent/5 border border-accent/20 text-center">
                <Target className="w-8 h-8 text-accent mx-auto mb-2" />
                <div className="text-2xl font-bold">15</div>
                <p className="text-sm text-muted-foreground">Questions</p>
              </div>
              <div className="p-6 rounded-xl bg-secondary border text-center">
                <Brain className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">Mixed</div>
                <p className="text-sm text-muted-foreground">Question Types</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">Exam Features:</h3>
              <ul className="space-y-2">
                {[
                  "MCQ, Short Answer, and Calculation questions",
                  "Generated from your trained course material",
                  "Immediate feedback and detailed review",
                  "Performance breakdown by question type",
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <Button
              onClick={handleStartExam}
              disabled={isLoadingQuestions}
              className="w-full gradient-primary shadow-glow text-lg py-6"
            >
              {isLoadingQuestions ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Your Exam...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Start Mock Exam
                </>
              )}
            </Button>
            
            {isLoadingQuestions && (
              <p className="text-center text-sm text-muted-foreground">
                This may take 10-15 seconds while we generate personalized questions
              </p>
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
                <Badge variant={
                  question.difficulty === "easy" ? "default" : 
                  question.difficulty === "hard" ? "destructive" : "secondary"
                }>
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
            <Badge variant="outline" className="ml-4">{question.points} pts</Badge>
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
              <p className="text-xs text-muted-foreground">
                {currentAnswer.length}/500 characters
              </p>
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
              <p className="text-xs text-muted-foreground">
                Include units in your answer if required
              </p>
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
