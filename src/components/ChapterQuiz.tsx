import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2, Trophy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface ChapterQuizProps {
  chapterId: number;
  chapterTitle: string;
  onQuizComplete: (passed: boolean, score: number) => void;
}

const ChapterQuiz = ({ chapterId, chapterTitle, onQuizComplete }: ChapterQuizProps) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);

  const loadQuiz = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-chapter-quiz", {
        body: { chapterId, numQuestions: 5 }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.questions || data.questions.length === 0) {
        throw new Error("No questions generated");
      }

      setQuestions(data.questions);
      setQuizStarted(true);
      setCurrentQuestion(0);
      setSelectedAnswers({});
      setShowResults(false);
    } catch (error: any) {
      console.error("Error loading quiz:", error);
      toast.error(error.message || "Failed to load quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (answerIndex: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestion]: answerIndex
    }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    const score = questions.reduce((acc, q, idx) => {
      return acc + (selectedAnswers[idx] === q.correctAnswer ? 1 : 0);
    }, 0);

    setShowResults(true);
    const passed = (score / questions.length) * 100 >= 80;
    onQuizComplete(passed, score);
  };

  const calculateScore = () => {
    return questions.reduce((acc, q, idx) => {
      return acc + (selectedAnswers[idx] === q.correctAnswer ? 1 : 0);
    }, 0);
  };

  if (!quizStarted) {
    return (
      <Card className="glass-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Chapter {chapterId} Quiz</CardTitle>
          <CardDescription>{chapterTitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="space-y-2">
            <p className="text-muted-foreground">
              Test your knowledge of this chapter. You need <span className="font-bold text-primary">80% or higher</span> to unlock the next chapter.
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 5 multiple choice questions</li>
              <li>• Questions are AI-generated based on course content</li>
              <li>• You can retake the quiz as many times as needed</li>
            </ul>
          </div>
          <Button onClick={loadQuiz} disabled={loading} size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Quiz...
              </>
            ) : (
              "Start Quiz"
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (showResults) {
    const score = calculateScore();
    const percentage = Math.round((score / questions.length) * 100);
    const passed = percentage >= 80;

    return (
      <Card className="glass-card">
        <CardHeader className="text-center">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${passed ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            {passed ? (
              <Trophy className="w-8 h-8 text-green-500" />
            ) : (
              <XCircle className="w-8 h-8 text-red-500" />
            )}
          </div>
          <CardTitle className="text-2xl mt-4">
            {passed ? "Congratulations!" : "Keep Practicing!"}
          </CardTitle>
          <CardDescription>
            You scored {score} out of {questions.length} ({percentage}%)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Progress value={percentage} className="h-3" />
          
          <div className="text-center">
            {passed ? (
              <Badge variant="default" className="text-lg px-4 py-2 bg-green-500">
                Chapter {chapterId + 1} Unlocked!
              </Badge>
            ) : (
              <p className="text-muted-foreground">
                You need 80% to pass. Review the explanations below and try again.
              </p>
            )}
          </div>

          {/* Question Review */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {questions.map((q, idx) => {
              const isCorrect = selectedAnswers[idx] === q.correctAnswer;
              return (
                <div key={q.id} className={`p-4 rounded-lg border ${isCorrect ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                  <div className="flex items-start gap-2">
                    {isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{q.question}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your answer: {q.options[selectedAnswers[idx]] || "Not answered"}
                      </p>
                      {!isCorrect && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          Correct: {q.options[q.correctAnswer]}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        {q.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => setQuizStarted(false)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retake Quiz
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const allAnswered = Object.keys(selectedAnswers).length === questions.length;

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Badge variant="outline">Question {currentQuestion + 1} of {questions.length}</Badge>
          <span className="text-sm text-muted-foreground">{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">{question.question}</h3>
          <div className="space-y-3">
            {question.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectAnswer(idx)}
                className={`w-full p-4 text-left rounded-lg border transition-all ${
                  selectedAnswers[currentQuestion] === idx
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedAnswers[currentQuestion] === idx
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground'
                  }`}>
                    {selectedAnswers[currentQuestion] === idx && (
                      <CheckCircle className="w-4 h-4" />
                    )}
                  </div>
                  <span>{option}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>
          
          {currentQuestion === questions.length - 1 ? (
            <Button onClick={handleSubmit} disabled={!allAnswered}>
              Submit Quiz
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={selectedAnswers[currentQuestion] === undefined}>
              Next
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ChapterQuiz;
