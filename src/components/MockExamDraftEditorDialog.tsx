import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  Plus,
  Printer,
  Save,
  Trash2,
  Wand2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  MockExamDifficulty,
  MockExamImageAsset,
  MockExamLongForm,
  MockExamMcq,
  MockExamStructuredPayload,
} from "@/types/mockExam";
import {
  applyMockExamDraftAutofixes,
  cloneStructuredPayload,
  getMockExamDraftWarnings,
} from "@/utils/mockExamDraft";

interface MockExamDraftEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic: string;
  difficulty: MockExamDifficulty;
  structured: MockExamStructuredPayload | null;
  canSave: boolean;
  isSaving: boolean;
  isPrinting: boolean;
  onSave: (payload: {
    topic: string;
    structured: MockExamStructuredPayload;
  }) => Promise<void> | void;
  onPrint: (payload: {
    topic: string;
    structured: MockExamStructuredPayload;
  }) => Promise<void> | void;
}

const syncLongFormMarks = (question: MockExamLongForm): MockExamLongForm => ({
  ...question,
  marks: (question.sub_parts ?? []).reduce((sum, part) => sum + (Number(part.marks) || 0), 0),
});

const normalizeImages = (images?: MockExamImageAsset[]) =>
  Array.isArray(images)
    ? images.map((image) => ({
        url: image?.url ?? "",
        alt: image?.alt ?? "",
        caption: image?.caption ?? "",
        widthPercent:
          typeof image?.widthPercent === "number" && !Number.isNaN(image.widthPercent)
            ? image.widthPercent
            : 100,
      }))
    : [];

const normalizeMcq = (question: MockExamMcq): MockExamMcq => ({
  ...question,
  marks: Number(question.marks ?? 2) || 2,
  options:
    question.options.length > 0
      ? question.options
      : ["", "", "", ""],
  images: normalizeImages(question.images),
});

const normalizeStructured = (
  structured: MockExamStructuredPayload | null,
): MockExamStructuredPayload | null => {
  if (!structured) {
    return null;
  }

  const cloned = cloneStructuredPayload(structured);
  if (!cloned) {
    return null;
  }

  return {
    ...cloned,
    mcqs: cloned.mcqs.map(normalizeMcq),
    longForm: cloned.longForm.map((question) =>
      syncLongFormMarks({
        ...question,
        images: normalizeImages(question.images),
        sub_parts:
          question.sub_parts && question.sub_parts.length > 0
            ? question.sub_parts
            : [{ label: "a", text: "", marks: 0 }],
      }),
    ),
  };
};

export const MockExamDraftEditorDialog = ({
  open,
  onOpenChange,
  topic,
  difficulty,
  structured,
  canSave,
  isSaving,
  isPrinting,
  onSave,
  onPrint,
}: MockExamDraftEditorDialogProps) => {
  const [draftTopic, setDraftTopic] = useState(topic);
  const [draftStructured, setDraftStructured] = useState<MockExamStructuredPayload | null>(
    normalizeStructured(structured),
  );
  const [autofixMessages, setAutofixMessages] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraftTopic(topic);
    setDraftStructured(normalizeStructured(structured));
    setAutofixMessages([]);
  }, [open, topic, structured]);

  const warnings = getMockExamDraftWarnings(draftStructured);

  const updateMcq = (index: number, updater: (question: MockExamMcq) => MockExamMcq) => {
    setDraftStructured((current) => {
      if (!current) {
        return current;
      }

      const nextMcqs = [...current.mcqs];
      nextMcqs[index] = normalizeMcq(updater(nextMcqs[index]));
      return {
        ...current,
        mcqs: nextMcqs,
      };
    });
  };

  const updateLongForm = (
    index: number,
    updater: (question: MockExamLongForm) => MockExamLongForm,
  ) => {
    setDraftStructured((current) => {
      if (!current) {
        return current;
      }

      const nextLongForm = [...current.longForm];
      nextLongForm[index] = syncLongFormMarks(updater(nextLongForm[index]));
      return {
        ...current,
        longForm: nextLongForm,
      };
    });
  };

  const renderImageEditor = ({
    images,
    onAdd,
    onUpdate,
    onRemove,
    title = "Images",
  }: {
    images?: MockExamImageAsset[];
    onAdd: () => void;
    onUpdate: (imageIndex: number, field: keyof MockExamImageAsset, value: string | number) => void;
    onRemove: (imageIndex: number) => void;
    title?: string;
  }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label>{title}</Label>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Image
        </Button>
      </div>

      {Array.isArray(images) && images.length > 0 ? (
        images.map((image, imageIndex) => (
          <div key={`question-image-${imageIndex}`} className="rounded-lg border p-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px_auto]">
              <div className="space-y-2 md:col-span-3">
                <div className="flex items-center justify-between gap-2">
                  <Label>Image URL</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => onRemove(imageIndex)}
                    aria-label="Remove image"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  value={image.url}
                  onChange={(event) => onUpdate(imageIndex, "url", event.target.value)}
                  placeholder="https://... or data:image/..."
                />
              </div>

              <div className="space-y-2">
                <Label>Width %</Label>
                <Input
                  type="number"
                  min={20}
                  max={100}
                  value={image.widthPercent ?? 100}
                  onChange={(event) =>
                    onUpdate(imageIndex, "widthPercent", Math.min(Math.max(Number(event.target.value) || 100, 20), 100))
                  }
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Alt Text</Label>
                <Input
                  value={image.alt ?? ""}
                  onChange={(event) => onUpdate(imageIndex, "alt", event.target.value)}
                  placeholder="Short description"
                />
              </div>

              <div className="space-y-2 md:col-span-3">
                <Label>Caption</Label>
                <Input
                  value={image.caption ?? ""}
                  onChange={(event) => onUpdate(imageIndex, "caption", event.target.value)}
                  placeholder="Optional caption shown under the image"
                />
              </div>
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">
          No images added yet. Use a public `https://` URL or a `data:image/...` URL.
        </p>
      )}
    </div>
  );

  const handleAutofix = () => {
    const result = applyMockExamDraftAutofixes(draftStructured);
    setDraftStructured(normalizeStructured(result.structured));
    setAutofixMessages(result.changes);
  };

  const handleSave = async () => {
    if (!draftStructured) {
      return;
    }

    await onSave({
      topic: draftTopic.trim() || topic,
      structured: draftStructured,
    });
  };

  const handlePrint = async () => {
    if (!draftStructured) {
      return;
    }

    await onPrint({
      topic: draftTopic.trim() || topic,
      structured: draftStructured,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-6xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>Edit Exam Draft</DialogTitle>
            <Badge variant="outline">Exam Simulation</Badge>
            <Badge variant="secondary">{difficulty}</Badge>
          </div>
          <DialogDescription>
            Edit the structured exam content directly, then print a fresh PDF locally. Saved
            draft edits clear the old PDF link because the exported paper has changed.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-6 px-6 py-5">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <Label htmlFor="mock-exam-draft-topic">Exam Title</Label>
                <Input
                  id="mock-exam-draft-topic"
                  value={draftTopic}
                  onChange={(event) => setDraftTopic(event.target.value)}
                  placeholder="Computer Networks"
                />
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <Button type="button" variant="outline" onClick={handleAutofix} disabled={!draftStructured}>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Apply Safety Fixes
                </Button>
              </div>
            </div>

            {autofixMessages.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="space-y-1">
                  <p className="font-medium">Auto-fixes applied</p>
                  {autofixMessages.map((message) => (
                    <p key={message}>{message}</p>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {warnings.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="space-y-1">
                  <p className="font-medium">Draft warnings</p>
                  {warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {!draftStructured ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This exam has no structured draft content to edit.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">Multiple Choice</h3>
                      <p className="text-sm text-muted-foreground">
                        Edit question text, options, correct answers, and marks.
                      </p>
                    </div>
                    <Badge variant="outline">{draftStructured.mcqs.length} questions</Badge>
                  </div>

                  {draftStructured.mcqs.map((question, index) => (
                    <Card key={`mcq-${question.number}-${index}`}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Question {question.number}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_120px_140px]">
                          <div className="space-y-2 md:col-span-3">
                            <Label>Question Text</Label>
                            <Textarea
                              value={question.question}
                              onChange={(event) =>
                                updateMcq(index, (current) => ({
                                  ...current,
                                  question: event.target.value,
                                }))
                              }
                              rows={3}
                            />
                          </div>

                          <div className="md:col-span-3">
                            {renderImageEditor({
                              images: question.images,
                              onAdd: () =>
                                updateMcq(index, (current) => ({
                                  ...current,
                                  images: [
                                    ...(current.images ?? []),
                                    { url: "", alt: "", caption: "", widthPercent: 100 },
                                  ],
                                })),
                              onUpdate: (imageIndex, field, value) =>
                                updateMcq(index, (current) => ({
                                  ...current,
                                  images: (current.images ?? []).map((image, currentImageIndex) =>
                                    currentImageIndex === imageIndex
                                      ? { ...image, [field]: value }
                                      : image,
                                  ),
                                })),
                              onRemove: (imageIndex) =>
                                updateMcq(index, (current) => ({
                                  ...current,
                                  images: (current.images ?? []).filter(
                                    (_, currentImageIndex) => currentImageIndex !== imageIndex,
                                  ),
                                })),
                            })}
                          </div>

                          <div className="space-y-2">
                            <Label>Marks</Label>
                            <Input
                              type="number"
                              min={1}
                              value={question.marks ?? 2}
                              onChange={(event) =>
                                updateMcq(index, (current) => ({
                                  ...current,
                                  marks: Math.max(1, Number(event.target.value) || 1),
                                }))
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Correct Answer</Label>
                            <Select
                              value={(question.correct_answer ?? "__unset").toUpperCase()}
                              onValueChange={(value) =>
                                updateMcq(index, (current) => ({
                                  ...current,
                                  correct_answer: value === "__UNSET" ? undefined : value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select answer" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__UNSET">Unset</SelectItem>
                                {question.options.map((_, optionIndex) => {
                                  const label = String.fromCharCode(65 + optionIndex);
                                  return (
                                    <SelectItem key={label} value={label}>
                                      {label}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <Label>Options</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateMcq(index, (current) => ({
                                  ...current,
                                  options: [...current.options, ""],
                                }))
                              }
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add Option
                            </Button>
                          </div>

                          {question.options.map((option, optionIndex) => (
                            <div key={`mcq-option-${question.number}-${optionIndex}`} className="flex gap-2">
                              <Input
                                value={option}
                                onChange={(event) =>
                                  updateMcq(index, (current) => ({
                                    ...current,
                                    options: current.options.map((value, valueIndex) =>
                                      valueIndex === optionIndex ? event.target.value : value,
                                    ),
                                  }))
                                }
                                placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                  updateMcq(index, (current) => {
                                    const nextOptions = current.options.filter(
                                      (_, valueIndex) => valueIndex !== optionIndex,
                                    );
                                    const nextAnswer = current.correct_answer?.toUpperCase();
                                    const removedLetter = String.fromCharCode(65 + optionIndex);
                                    const nextAnswerIndex =
                                      typeof nextAnswer === "string"
                                        ? nextAnswer.charCodeAt(0) - 65
                                        : -1;

                                    return {
                                      ...current,
                                      options: nextOptions.length >= 4 ? nextOptions : current.options,
                                      correct_answer:
                                        nextOptions.length >= 4 && nextAnswer === removedLetter
                                          ? undefined
                                          : nextOptions.length >= 4 &&
                                              nextAnswerIndex > optionIndex &&
                                              nextAnswerIndex >= 0
                                            ? String.fromCharCode(64 + nextAnswerIndex)
                                          : current.correct_answer,
                                    };
                                  })
                                }
                                disabled={question.options.length <= 4}
                                aria-label="Remove option"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-2">
                          <Label>Explanation / Answer Key Notes</Label>
                          <Textarea
                            value={question.explanation ?? ""}
                            onChange={(event) =>
                              updateMcq(index, (current) => ({
                                ...current,
                                explanation: event.target.value,
                              }))
                            }
                            rows={3}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">Open-Ended</h3>
                      <p className="text-sm text-muted-foreground">
                        Edit the scenario text, Mermaid diagram, sub-parts, and model answer.
                      </p>
                    </div>
                    <Badge variant="outline">{draftStructured.longForm.length} questions</Badge>
                  </div>

                  {draftStructured.longForm.map((question, index) => (
                    <Card key={`long-form-${question.number}-${index}`}>
                      <CardHeader className="pb-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <CardTitle className="text-base">Question {question.number}</CardTitle>
                          <Badge variant="secondary">{question.marks ?? 0} marks</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Scenario Text</Label>
                          <Textarea
                            value={question.question}
                            onChange={(event) =>
                              updateLongForm(index, (current) => ({
                                ...current,
                                question: event.target.value,
                              }))
                            }
                            rows={4}
                          />
                        </div>

                        {renderImageEditor({
                          images: question.images,
                          onAdd: () =>
                            updateLongForm(index, (current) => ({
                              ...current,
                              images: [
                                ...(current.images ?? []),
                                { url: "", alt: "", caption: "", widthPercent: 100 },
                              ],
                            })),
                          onUpdate: (imageIndex, field, value) =>
                            updateLongForm(index, (current) => ({
                              ...current,
                              images: (current.images ?? []).map((image, currentImageIndex) =>
                                currentImageIndex === imageIndex
                                  ? { ...image, [field]: value }
                                  : image,
                              ),
                            })),
                          onRemove: (imageIndex) =>
                            updateLongForm(index, (current) => ({
                              ...current,
                              images: (current.images ?? []).filter(
                                (_, currentImageIndex) => currentImageIndex !== imageIndex,
                              ),
                            })),
                        })}

                        <div className="space-y-2">
                          <Label>Mermaid Diagram</Label>
                          <Textarea
                            value={question.diagram ?? ""}
                            onChange={(event) =>
                              updateLongForm(index, (current) => ({
                                ...current,
                                diagram: event.target.value,
                              }))
                            }
                            rows={7}
                            placeholder={"graph LR\nHostA[\"Host A\"] -->|\"10 Mbps\"| Router1[\"Router 1\"]"}
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <Label>Sub-parts</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateLongForm(index, (current) => ({
                                  ...current,
                                  sub_parts: [
                                    ...(current.sub_parts ?? []),
                                    {
                                      label: String.fromCharCode(97 + (current.sub_parts?.length ?? 0)),
                                      text: "",
                                      marks: 0,
                                    },
                                  ],
                                }))
                              }
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add Sub-part
                            </Button>
                          </div>

                          {(question.sub_parts ?? []).map((part, partIndex) => (
                            <div
                              key={`long-form-part-${question.number}-${partIndex}`}
                              className="rounded-lg border p-4"
                            >
                              <div className="grid gap-3 md:grid-cols-[90px_120px_auto]">
                                <div className="space-y-2">
                                  <Label>Label</Label>
                                  <Input
                                    value={part.label}
                                    onChange={(event) =>
                                      updateLongForm(index, (current) => ({
                                        ...current,
                                        sub_parts: (current.sub_parts ?? []).map((value, valueIndex) =>
                                          valueIndex === partIndex
                                            ? { ...value, label: event.target.value }
                                            : value,
                                        ),
                                      }))
                                    }
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label>Marks</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    value={part.marks}
                                    onChange={(event) =>
                                      updateLongForm(index, (current) => ({
                                        ...current,
                                        sub_parts: (current.sub_parts ?? []).map((value, valueIndex) =>
                                          valueIndex === partIndex
                                            ? {
                                                ...value,
                                                marks: Math.max(0, Number(event.target.value) || 0),
                                              }
                                            : value,
                                        ),
                                      }))
                                    }
                                  />
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <Label>Prompt</Label>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() =>
                                        updateLongForm(index, (current) => ({
                                          ...current,
                                          sub_parts:
                                            (current.sub_parts ?? []).length > 1
                                              ? (current.sub_parts ?? []).filter(
                                                  (_, valueIndex) => valueIndex !== partIndex,
                                                )
                                              : current.sub_parts,
                                        }))
                                      }
                                      disabled={(question.sub_parts ?? []).length <= 1}
                                      aria-label="Remove sub-part"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <Textarea
                                    value={part.text}
                                    onChange={(event) =>
                                      updateLongForm(index, (current) => ({
                                        ...current,
                                        sub_parts: (current.sub_parts ?? []).map((value, valueIndex) =>
                                          valueIndex === partIndex
                                            ? { ...value, text: event.target.value }
                                            : value,
                                        ),
                                      }))
                                    }
                                    rows={3}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-2">
                          <Label>Model Answer</Label>
                          <Textarea
                            value={question.model_answer ?? ""}
                            onChange={(event) =>
                              updateLongForm(index, (current) => ({
                                ...current,
                                model_answer: event.target.value,
                              }))
                            }
                            rows={6}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </section>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t px-6 py-4">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Print generates a fresh local PDF from this edited draft. It does not reuse the old
              Drive PDF.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={handlePrint} disabled={!draftStructured || isPrinting}>
                {isPrinting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparing
                  </>
                ) : (
                  <>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Draft
                  </>
                )}
              </Button>
              <Button type="button" onClick={handleSave} disabled={!draftStructured || !canSave || isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MockExamDraftEditorDialog;
