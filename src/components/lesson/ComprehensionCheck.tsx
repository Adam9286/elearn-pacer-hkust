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
}

const ComprehensionCheck = ({
  open,
  onOpenChange,
  question,
  onAnswer,
  onSkip,
}: ComprehensionCheckProps) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Quick Comprehension Check
          </DialogTitle>
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
                    className="flex-1 cursor-pointer"
                  >
                    {option}
                  </Label>
                  {hasSubmitted && isCorrectOption && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  {hasSubmitted && isSelected && !isCorrectOption && (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              );
            })}
          </RadioGroup>

          {/* Result Feedback */}
          {hasSubmitted && (
            <div className={cn(
              "rounded-lg p-4",
              isCorrect ? "bg-green-500/10 border border-green-500/30" : "bg-amber-500/10 border border-amber-500/30"
            )}>
              <div className="flex items-start gap-3">
                {isCorrect ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                ) : (
                  <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5" />
                )}
                <div>
                  <p className={cn(
                    "font-medium mb-1",
                    isCorrect ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
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
              <Button variant="ghost" onClick={handleSkip}>
                <SkipForward className="mr-2 h-4 w-4" />
                Skip for now
              </Button>
              <Button onClick={handleSubmit} disabled={selectedOption === null}>
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
