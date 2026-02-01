// Test Yourself Card Component
// Inline comprehension check triggered by user action
// Supports retry for wrong answers and tracks answered state

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Lightbulb, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComprehensionQuestion } from "./ComprehensionCheck";

interface TestYourselfCardProps {
  question: ComprehensionQuestion | null;
  pageNumber: number;
  hasBeenAnswered?: boolean;      // Whether this page was already answered in DB
  previouslyCorrect?: boolean;    // Whether the previous answer was correct
  onAnswer: (correct: boolean, isRetry: boolean) => void;
  className?: string;
}

/**
 * TestYourselfCard - Inline comprehension check
 * 
 * Shows a collapsible card with the current page's question.
 * User must click to expand and answer - no auto-popup.
 * Supports retry for wrong answers.
 */
const TestYourselfCard = ({
  question,
  pageNumber,
  hasBeenAnswered = false,
  previouslyCorrect = false,
  onAnswer,
  className
}: TestYourselfCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isRetryAttempt, setIsRetryAttempt] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  
  const MAX_ATTEMPTS = 3;

  // Reset state when question changes (new page)
  useEffect(() => {
    setSelectedOption(null);
    setHasSubmitted(false);
    setIsCorrect(false);
    setIsExpanded(false);
    setIsRetryAttempt(false);
    setAttemptCount(0);
  }, [question?.question, pageNumber]);

  // If page was already answered correctly, show that state
  useEffect(() => {
    if (hasBeenAnswered && previouslyCorrect) {
      setHasSubmitted(true);
      setIsCorrect(true);
      setIsExpanded(true);
    }
  }, [hasBeenAnswered, previouslyCorrect]);

  if (!question) {
    return null;
  }

  const handleSubmit = () => {
    if (!selectedOption) return;
    
    setAttemptCount(prev => prev + 1);
    const selectedIndex = selectedOption.charCodeAt(0) - 65; // A=0, B=1, etc.
    const correct = selectedIndex === question.correctIndex;
    setIsCorrect(correct);
    setHasSubmitted(true);
    onAnswer(correct, isRetryAttempt);
  };

  const handleRetry = () => {
    setSelectedOption(null);
    setHasSubmitted(false);
    setIsCorrect(false);
    setIsRetryAttempt(true); // Mark next submit as a retry
  };

  // If already answered correctly in a previous session
  if (hasBeenAnswered && previouslyCorrect && !hasSubmitted) {
    return (
      <Card className={cn(
        "border-green-500/30 bg-green-500/5",
        className
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Already Answered
              <Badge variant="default" className="ml-2 bg-green-600">
                Correct!
              </Badge>
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              Page {pageNumber}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground text-left mt-1">
            You've already answered this question correctly.
          </p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "border-primary/20 transition-all",
      isExpanded && "ring-1 ring-primary/20",
      hasSubmitted && isCorrect && "border-green-500/30 bg-green-500/5",
      className
    )}>
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Test Yourself
              {hasSubmitted && (
                <Badge 
                  variant={isCorrect ? "default" : "destructive"}
                  className={cn(
                    "ml-2",
                    isCorrect && "bg-green-600"
                  )}
                >
                  {isCorrect ? "Correct!" : "Try again"}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Page {pageNumber}
              </Badge>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
          {!isExpanded && !hasSubmitted && (
            <p className="text-sm text-muted-foreground text-left mt-1">
              Click to test your understanding of this page
            </p>
          )}
        </CardHeader>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Question */}
          <p className="font-medium text-foreground">
            {question.question}
          </p>

          {/* Options */}
          <RadioGroup
            value={selectedOption || undefined}
            onValueChange={setSelectedOption}
            disabled={hasSubmitted}
            className="space-y-2"
          >
            {question.options.map((option, index) => {
              const optionLetter = String.fromCharCode(65 + index);
              const isSelected = selectedOption === optionLetter;
              const isThisCorrect = question.correctIndex === index;
              
              return (
                <div
                  key={optionLetter}
                  className={cn(
                    "flex items-center space-x-3 rounded-lg border p-3 transition-colors",
                    !hasSubmitted && "hover:bg-muted/50 cursor-pointer",
                    hasSubmitted && isThisCorrect && "border-green-500 bg-green-500/10",
                    hasSubmitted && isSelected && !isThisCorrect && "border-red-500 bg-red-500/10"
                  )}
                >
                  <RadioGroupItem value={optionLetter} id={`option-${optionLetter}-${pageNumber}`} />
                  <Label 
                    htmlFor={`option-${optionLetter}-${pageNumber}`}
                    className="flex-1 cursor-pointer text-sm"
                  >
                    <span className="font-medium mr-2">{optionLetter}.</span>
                    {option}
                  </Label>
                  {hasSubmitted && isThisCorrect && (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  )}
                  {hasSubmitted && isSelected && !isThisCorrect && (
                    <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                  )}
                </div>
              );
            })}
          </RadioGroup>

          {/* Submit / Explanation / Retry */}
          {!hasSubmitted ? (
            <Button 
              onClick={handleSubmit}
              disabled={!selectedOption}
              className="w-full"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Check Answer
            </Button>
          ) : (
            <div className="space-y-3">
              <div className={cn(
                "rounded-lg p-4",
                isCorrect ? "bg-green-500/10" : "bg-amber-500/10"
              )}>
                <p className={cn(
                  "font-medium mb-2",
                  isCorrect ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"
                )}>
                  {isCorrect ? "Great job!" : "Not quite right"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {question.explanation}
                </p>
              </div>
              
              {/* Retry Button - only show for wrong answers with attempts remaining */}
              {!isCorrect && attemptCount < MAX_ATTEMPTS && (
                <Button 
                  variant="outline"
                  onClick={handleRetry}
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again ({MAX_ATTEMPTS - attemptCount} {MAX_ATTEMPTS - attemptCount === 1 ? 'attempt' : 'attempts'} left)
                </Button>
              )}
              
              {/* No more attempts message */}
              {!isCorrect && attemptCount >= MAX_ATTEMPTS && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No more attempts. Review the explanation above and move on.
                </p>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default TestYourselfCard;
