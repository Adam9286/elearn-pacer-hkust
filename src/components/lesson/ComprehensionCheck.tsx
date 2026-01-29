// Comprehension Check Component
// MCQ modal/card with support for blocking and dismissible modes

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, XCircle, Lightbulb, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComprehensionQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface ComprehensionCheckProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: ComprehensionQuestion;
  onAnswer: (correct: boolean) => void;
  onSkip: () => void;
  mode?: 'blocking' | 'dismissible';
  questionsEnabled?: boolean;
  onQuestionsToggle?: (enabled: boolean) => void;
}

/**
 * ComprehensionCheck - MCQ comprehension question modal
 * 
 * Modes:
 * - blocking: Must answer to proceed (no skip button)
 * - dismissible: Can skip the question (default)
 */
const ComprehensionCheck = ({
  open,
  onOpenChange,
  question,
  onAnswer,
  onSkip,
  mode = 'dismissible',
  questionsEnabled = true,
  onQuestionsToggle,
}: ComprehensionCheckProps) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const isBlocking = mode === 'blocking';

  const handleSubmit = () => {
    if (selectedOption === null) return;
    
    const selectedIndex = parseInt(selectedOption, 10);
    const correct = selectedIndex === question.correctIndex;
    setIsCorrect(correct);
    setHasSubmitted(true);
  };

  const handleContinue = () => {
    onAnswer(isCorrect);
    // Reset state for next question
    setSelectedOption(null);
    setHasSubmitted(false);
    setIsCorrect(false);
    onOpenChange(false);
  };

  const handleSkip = () => {
    onSkip();
    setSelectedOption(null);
    setHasSubmitted(false);
    onOpenChange(false);
  };

  // Prevent closing dialog in blocking mode before answering
  const handleOpenChange = (newOpen: boolean) => {
    if (isBlocking && !hasSubmitted && !newOpen) {
      // Don't allow closing in blocking mode before submitting
      return;
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-lg"
        onPointerDownOutside={isBlocking && !hasSubmitted ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={isBlocking && !hasSubmitted ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Quick Comprehension Check
              {isBlocking && !hasSubmitted && (
                <span className="text-xs font-normal text-muted-foreground ml-2">
                  (Required)
                </span>
              )}
            </DialogTitle>
            {onQuestionsToggle && (
              <div className="flex items-center gap-2">
                <Switch 
                  id="popup-questions-toggle"
                  checked={questionsEnabled}
                  onCheckedChange={onQuestionsToggle}
                />
                <Label htmlFor="popup-questions-toggle" className="text-xs cursor-pointer text-muted-foreground">
                  Popup Questions
                </Label>
              </div>
            )}
          </div>
          <DialogDescription>
            Test your understanding of the material so far
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <p className="text-foreground font-medium">{question.question}</p>

          <RadioGroup
            value={selectedOption ?? undefined}
            onValueChange={setSelectedOption}
            disabled={hasSubmitted}
            className="space-y-3"
          >
            {question.options.map((option, index) => {
              const isSelected = selectedOption === index.toString();
              const isCorrectOption = index === question.correctIndex;
              
              let optionStyle = "";
              if (hasSubmitted) {
                if (isCorrectOption) {
                  optionStyle = "border-green-500 bg-green-500/10";
                } else if (isSelected && !isCorrectOption) {
                  optionStyle = "border-red-500 bg-red-500/10";
                }
              }

              return (
                <div
                  key={index}
                  className={cn(
                    "flex items-center space-x-3 rounded-lg border p-4 transition-colors",
                    !hasSubmitted && "hover:bg-muted/50 cursor-pointer",
                    isSelected && !hasSubmitted && "border-primary bg-primary/5",
                    optionStyle
                  )}
                  onClick={() => !hasSubmitted && setSelectedOption(index.toString())}
                >
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <Label 
                    htmlFor={`option-${index}`} 
                    className="flex-1 cursor-pointer text-foreground"
                  >
                    {option}
                  </Label>
                  {hasSubmitted && isCorrectOption && (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  )}
                  {hasSubmitted && isSelected && !isCorrectOption && (
                    <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                  )}
                </div>
              );
            })}
          </RadioGroup>

          {/* Result Feedback */}
          {hasSubmitted && (
            <div className={cn(
              "rounded-lg p-4",
              isCorrect 
                ? "bg-green-500/10 border border-green-500/30" 
                : "bg-amber-500/10 border border-amber-500/30"
            )}>
              <div className="flex items-start gap-3">
                {isCorrect ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                ) : (
                  <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                )}
                <div>
                  <p className={cn(
                    "font-medium mb-1",
                    isCorrect 
                      ? "text-green-600 dark:text-green-400" 
                      : "text-amber-600 dark:text-amber-400"
                  )}>
                    {isCorrect ? "Correct!" : "Not quite!"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {question.explanation}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          {!hasSubmitted ? (
            <>
              {!isBlocking && (
                <Button variant="ghost" onClick={handleSkip}>
                  <SkipForward className="mr-2 h-4 w-4" />
                  Skip for now
                </Button>
              )}
              {isBlocking && <div />}
              <Button 
                onClick={handleSubmit} 
                disabled={selectedOption === null}
                className={isBlocking ? "ml-auto" : ""}
              >
                Check Answer
              </Button>
            </>
          ) : (
            <Button onClick={handleContinue} className="ml-auto">
              Continue
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ComprehensionCheck;
