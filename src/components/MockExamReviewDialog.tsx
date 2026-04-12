import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type {
  MockExamDifficulty,
  MockExamImageAsset,
  MockExamStructuredPayload,
} from "@/types/mockExam";
import { MermaidDiagram } from "@/components/chat/MermaidDiagram";

interface MockExamReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic: string;
  difficulty: MockExamDifficulty;
  structured: MockExamStructuredPayload | null;
}

const formatOptionForDisplay = (option: string, index: number) => {
  const trimmed = option.trim();
  if (/^[A-Z][).:]\s/.test(trimmed)) {
    return option;
  }

  return `${String.fromCharCode(65 + index)}) ${option}`;
};

const getAnswerOptionText = (
  options: string[],
  correctAnswer?: string,
) => {
  if (!correctAnswer) {
    return null;
  }

  const answerLabel = correctAnswer.trim().toUpperCase();
  const answerIndex = answerLabel.charCodeAt(0) - 65;
  const answerOption =
    answerIndex >= 0 && answerIndex < options.length ? options[answerIndex] : null;

  return {
    label: answerLabel,
    text: answerOption ? formatOptionForDisplay(answerOption, answerIndex) : null,
  };
};

const isRenderableImageUrl = (value?: string | null) => {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) || /^data:image\//i.test(trimmed);
};

const normalizeImageWidthPercent = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 100;
  }

  return Math.min(Math.max(Math.round(value), 20), 100);
};

const renderImages = (images?: MockExamImageAsset[]) => {
  if (!Array.isArray(images) || images.length === 0) {
    return null;
  }

  const renderableImages = images.filter((image) => isRenderableImageUrl(image?.url));
  if (renderableImages.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3">
      {renderableImages.map((image, imageIndex) => (
        <figure
          key={`${image.url}-${imageIndex}`}
          className="overflow-hidden rounded-lg border bg-secondary/20 p-3"
          style={{ maxWidth: `${normalizeImageWidthPercent(image.widthPercent)}%` }}
        >
          <img
            src={image.url}
            alt={image.alt?.trim() || image.caption?.trim() || "Question image"}
            className="w-full rounded-md border object-contain"
          />
          {image.caption?.trim() && (
            <figcaption className="mt-2 text-sm text-muted-foreground">
              {image.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
};

const sectionLabelClassName =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";

const ReadOnlyBlock = ({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className="space-y-2.5">
    <p className={sectionLabelClassName}>{label}</p>
    <div className={className}>{children}</div>
  </div>
);

const MockExamReviewDialog = ({
  open,
  onOpenChange,
  topic,
  difficulty,
  structured,
}: MockExamReviewDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-6xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>Review Answers</DialogTitle>
            <Badge variant="outline">Exam Simulation</Badge>
            <Badge variant="secondary">{difficulty}</Badge>
          </div>
          <DialogDescription>
            Review the saved answer key and worked solutions for this exam without editing the draft.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-8 px-6 py-6">
            <div className="rounded-xl border bg-secondary/20 p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className={sectionLabelClassName}>Exam Title</p>
                  <h2 className="mt-1 text-2xl font-semibold">{topic}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{structured?.mcqs.length ?? 0} MCQs</Badge>
                  <Badge variant="outline">{structured?.longForm.length ?? 0} open-ended</Badge>
                </div>
              </div>
            </div>

            {!structured ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                No structured answer data is available for this saved exam.
              </div>
            ) : (
              <>
                <section className="space-y-5">
                  <div className="flex items-center justify-between gap-3 border-b pb-3">
                    <div>
                      <h3 className="text-xl font-semibold">Multiple Choice Review</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Read-only answer key for the saved exam MCQs.
                      </p>
                    </div>
                    <Badge variant="outline">{structured.mcqs.length} questions</Badge>
                  </div>

                  {structured.mcqs.map((question, index) => {
                    const answer = getAnswerOptionText(question.options ?? [], question.correct_answer);

                    return (
                      <Card key={`review-mcq-${question.number}-${index}`} className="overflow-hidden border-border/80 shadow-sm">
                        <CardHeader className="border-b bg-secondary/10 pb-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="space-y-1">
                              <p className={sectionLabelClassName}>MCQ</p>
                              <CardTitle className="text-lg">Question {question.number}</CardTitle>
                            </div>
                            <Badge variant="secondary">{question.marks ?? 2} marks</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-5 pt-5">
                          <ReadOnlyBlock
                            label="Question"
                            className="rounded-lg border bg-secondary/20 p-4 text-sm leading-7"
                          >
                            <div>
                              {question.question}
                            </div>
                          </ReadOnlyBlock>

                          {renderImages(question.images)}

                          <ReadOnlyBlock label="Options" className="space-y-2.5">
                            <div className="space-y-2">
                              {(question.options ?? []).map((option, optionIndex) => {
                                const optionLabel = String.fromCharCode(65 + optionIndex);
                                const isCorrect = optionLabel === question.correct_answer?.trim().toUpperCase();

                                return (
                                  <div
                                    key={`review-mcq-option-${question.number}-${optionIndex}`}
                                    className="rounded-lg border bg-background/60 p-3.5 text-sm shadow-sm"
                                  >
                                    <div className="flex flex-wrap items-start gap-2">
                                      <Badge variant={isCorrect ? "default" : "outline"}>
                                        {optionLabel}
                                      </Badge>
                                      <p className="flex-1 leading-relaxed">
                                        {formatOptionForDisplay(option, optionIndex)}
                                      </p>
                                      {isCorrect && <Badge variant="secondary">Correct</Badge>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </ReadOnlyBlock>

                          <Separator />

                          <div className="grid gap-4 md:grid-cols-2">
                            <ReadOnlyBlock
                              label="Correct Answer"
                              className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm leading-7"
                            >
                              <div>
                                {answer
                                  ? answer.text ?? answer.label
                                  : "No correct answer stored for this question."}
                              </div>
                            </ReadOnlyBlock>

                            <ReadOnlyBlock
                              label="Explanation"
                              className="rounded-lg border bg-secondary/20 p-4 text-sm leading-7 whitespace-pre-wrap break-words"
                            >
                              <div>
                                {question.explanation?.trim() || "No explanation stored for this question."}
                              </div>
                            </ReadOnlyBlock>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </section>

                <section className="space-y-5">
                  <div className="flex items-center justify-between gap-3 border-b pb-3">
                    <div>
                      <h3 className="text-xl font-semibold">Open-Ended Review</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Read-only worked solutions for the saved exam long-form questions.
                      </p>
                    </div>
                    <Badge variant="outline">{structured.longForm.length} questions</Badge>
                  </div>

                  {structured.longForm.map((question, index) => (
                    <Card
                      key={`review-long-form-${question.number}-${index}`}
                      className="overflow-hidden border-border/80 shadow-sm"
                    >
                      <CardHeader className="border-b bg-secondary/10 pb-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-1">
                            <p className={sectionLabelClassName}>Open-Ended Question</p>
                            <CardTitle className="text-lg">Question {question.number}</CardTitle>
                          </div>
                          <Badge variant="secondary">{question.marks ?? 0} marks</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6 pt-5">
                        <ReadOnlyBlock
                          label="Scenario"
                          className="rounded-lg border bg-secondary/20 p-4 text-sm leading-7 whitespace-pre-wrap break-words"
                        >
                          <div>
                            {question.question}
                          </div>
                        </ReadOnlyBlock>

                        {renderImages(question.images)}

                        {question.diagram?.trim() && (
                          <ReadOnlyBlock
                            label="Diagram"
                            className="rounded-xl border bg-background/40 p-3"
                          >
                            <div className="max-h-[34rem] overflow-auto rounded-lg">
                              <MermaidDiagram chart={question.diagram} />
                            </div>
                          </ReadOnlyBlock>
                        )}

                        {Array.isArray(question.sub_parts) && question.sub_parts.length > 0 && (
                          <ReadOnlyBlock label="Sub-parts" className="space-y-3">
                            <div className="space-y-3">
                              {question.sub_parts.map((part, partIndex) => (
                                <div
                                  key={`review-sub-part-${question.number}-${partIndex}`}
                                  className="rounded-lg border bg-background/60 p-4 shadow-sm"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <Badge variant="outline">({part.label})</Badge>
                                    <Badge variant="secondary">{part.marks} marks</Badge>
                                  </div>
                                  <p className="mt-3 text-sm leading-7 whitespace-pre-wrap break-words">
                                    {part.text}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </ReadOnlyBlock>
                        )}

                        <ReadOnlyBlock
                          label="Model Answer"
                          className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 to-primary/5 p-5 shadow-sm"
                        >
                          <div className="max-h-[26rem] overflow-auto rounded-lg border bg-background/70 px-4 py-3 text-sm leading-7 whitespace-pre-wrap break-words">
                            {question.model_answer?.trim() || "No model answer stored for this question."}
                          </div>
                        </ReadOnlyBlock>
                      </CardContent>
                    </Card>
                  ))}
                </section>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MockExamReviewDialog;
