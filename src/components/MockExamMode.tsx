import { useState } from "react";
import { Brain, Clock, Target, Play, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  topic: string;
}

const sampleQuestions: Question[] = [
  {
    id: 1,
    question: "What is the primary purpose of TCP flow control?",
    options: [
      "To encrypt data during transmission",
      "To prevent the sender from overwhelming the receiver",
      "To route packets efficiently",
      "To compress data packets",
    ],
    correctAnswer: 1,
    topic: "Transport Layer",
  },
];

const MockExamMode = () => {
  const [examStarted, setExamStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const handleStartExam = () => {
    setExamStarted(true);
    setShowResults(false);
    setScore(0);
    setCurrentQuestion(0);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === sampleQuestions[currentQuestion].correctAnswer.toString()) {
      setScore(score + 1);
    }
    
    if (currentQuestion < sampleQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer("");
    } else {
      setShowResults(true);
      setExamStarted(false);
    }
  };

  if (showResults) {
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
                {Math.round((score / sampleQuestions.length) * 100)}%
              </div>
              <p className="text-muted-foreground">
                {score} out of {sampleQuestions.length} questions correct
              </p>
            </div>
            <Progress value={(score / sampleQuestions.length) * 100} className="h-3" />
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center p-4 rounded-lg bg-secondary">
                <div className="text-2xl font-bold text-primary">{score}</div>
                <p className="text-sm text-muted-foreground">Correct</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-secondary">
                <div className="text-2xl font-bold text-destructive">
                  {sampleQuestions.length - score}
                </div>
                <p className="text-sm text-muted-foreground">Incorrect</p>
              </div>
            </div>
            <Button onClick={handleStartExam} className="w-full gradient-primary shadow-glow">
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
        {/* Exam Setup */}
        <Card className="glass-card shadow-lg border-2">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary" />
              Adaptive Mock Exam
            </CardTitle>
            <CardDescription>
              AI-powered practice tests that adapt to your weak areas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
                <div className="text-2xl font-bold">Adaptive</div>
                <p className="text-sm text-muted-foreground">Difficulty</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">Exam Features:</h3>
              <ul className="space-y-2">
                {[
                  "Questions weighted by your weak areas",
                  "Immediate feedback after completion",
                  "Detailed explanations for all answers",
                  "Progress saved automatically",
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
              className="w-full gradient-primary shadow-glow text-lg py-6"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Mock Exam
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Exam In Progress
  const question = sampleQuestions[currentQuestion];

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card className="glass-card shadow-lg">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Badge variant="outline" className="mb-2">
                {question.topic}
              </Badge>
              <p className="text-sm text-muted-foreground">
                Question {currentQuestion + 1} of {sampleQuestions.length}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {Math.round(((currentQuestion + 1) / sampleQuestions.length) * 100)}%
              </div>
              <p className="text-xs text-muted-foreground">Progress</p>
            </div>
          </div>
          <Progress value={((currentQuestion + 1) / sampleQuestions.length) * 100} className="h-2" />
        </CardContent>
      </Card>

      {/* Question */}
      <Card className="glass-card shadow-lg border-2">
        <CardHeader>
          <CardTitle className="text-xl leading-relaxed">{question.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
            <div className="space-y-3">
              {question.options.map((option, idx) => (
                <div
                  key={idx}
                  className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-smooth cursor-pointer ${
                    selectedAnswer === idx.toString()
                      ? "border-primary bg-primary/5 shadow-glow"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedAnswer(idx.toString())}
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
            disabled={!selectedAnswer}
            className="w-full gradient-primary shadow-glow"
          >
            {currentQuestion < sampleQuestions.length - 1 ? "Next Question" : "Finish Exam"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MockExamMode;
