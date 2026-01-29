// Slide editor component for reviewing and editing explanations

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, X, Save, RefreshCw, Plus, Trash2 } from 'lucide-react';
import type { SlideExplanation, SlideStatus } from '@/services/adminApi';

interface SlideEditorProps {
  slide: SlideExplanation;
  onSave: (updates: Partial<SlideExplanation>) => Promise<void>;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  onRegenerate: () => Promise<void>;
  isLoading: boolean;
}

export function SlideEditor({
  slide,
  onSave,
  onApprove,
  onReject,
  onRegenerate,
  isLoading,
}: SlideEditorProps) {
  // Local state for editing
  const [explanation, setExplanation] = useState(slide.explanation);
  const [keyPoints, setKeyPoints] = useState<string[]>(slide.key_points || []);
  const [question, setQuestion] = useState(slide.comprehension_question?.question || '');
  const [options, setOptions] = useState<string[]>(
    slide.comprehension_question?.options || ['', '', '', '']
  );
  const [correctIndex, setCorrectIndex] = useState(
    slide.comprehension_question?.correctIndex ?? 0
  );
  const [questionExplanation, setQuestionExplanation] = useState(
    slide.comprehension_question?.explanation || ''
  );

  // Reset form when slide changes
  useEffect(() => {
    setExplanation(slide.explanation);
    setKeyPoints(slide.key_points || []);
    setQuestion(slide.comprehension_question?.question || '');
    setOptions(slide.comprehension_question?.options || ['', '', '', '']);
    setCorrectIndex(slide.comprehension_question?.correctIndex ?? 0);
    setQuestionExplanation(slide.comprehension_question?.explanation || '');
  }, [slide.id]);

  const hasChanges = 
    explanation !== slide.explanation ||
    JSON.stringify(keyPoints) !== JSON.stringify(slide.key_points) ||
    question !== (slide.comprehension_question?.question || '') ||
    JSON.stringify(options) !== JSON.stringify(slide.comprehension_question?.options || ['', '', '', '']) ||
    correctIndex !== (slide.comprehension_question?.correctIndex ?? 0) ||
    questionExplanation !== (slide.comprehension_question?.explanation || '');

  const handleSave = async () => {
    const updates: Partial<SlideExplanation> = {
      explanation,
      key_points: keyPoints.filter(kp => kp.trim()),
    };

    // Only include question if it has content
    if (question.trim()) {
      updates.comprehension_question = {
        question: question.trim(),
        options: options.map(o => o.trim()),
        correctIndex,
        explanation: questionExplanation.trim(),
      };
    } else {
      updates.comprehension_question = null;
    }

    await onSave(updates);
  };

  const addKeyPoint = () => {
    setKeyPoints([...keyPoints, '']);
  };

  const updateKeyPoint = (index: number, value: string) => {
    const updated = [...keyPoints];
    updated[index] = value;
    setKeyPoints(updated);
  };

  const removeKeyPoint = (index: number) => {
    setKeyPoints(keyPoints.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const statusColor: Record<SlideStatus, string> = {
    draft: 'bg-yellow-500',
    approved: 'bg-green-600',
    rejected: 'bg-red-500',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Slide {slide.slide_number}</h2>
          <Badge className={statusColor[slide.status]}>{slide.status}</Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Regenerate
          </Button>
        </div>
      </div>

      {/* Explanation */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Explanation</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={8}
            className="resize-y"
            placeholder="Enter slide explanation..."
          />
        </CardContent>
      </Card>

      {/* Key Points */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Key Points</CardTitle>
            <Button variant="ghost" size="sm" onClick={addKeyPoint}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {keyPoints.map((point, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={point}
                onChange={(e) => updateKeyPoint(index, e.target.value)}
                placeholder={`Key point ${index + 1}`}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeKeyPoint(index)}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
          {keyPoints.length === 0 && (
            <p className="text-sm text-muted-foreground">No key points yet</p>
          )}
        </CardContent>
      </Card>

      {/* Comprehension Question */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Comprehension Question</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="question">Question</Label>
            <Textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={2}
              placeholder="Enter question..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {options.map((option, index) => (
              <div key={index}>
                <Label htmlFor={`option-${index}`}>
                  Option {String.fromCharCode(65 + index)}
                  {correctIndex === index && (
                    <Badge className="ml-2 bg-green-600 text-xs">Correct</Badge>
                  )}
                </Label>
                <Input
                  id={`option-${index}`}
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + index)}`}
                />
              </div>
            ))}
          </div>

          <div>
            <Label htmlFor="correct-answer">Correct Answer</Label>
            <Select
              value={correctIndex.toString()}
              onValueChange={(v) => setCorrectIndex(parseInt(v))}
            >
              <SelectTrigger id="correct-answer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">A</SelectItem>
                <SelectItem value="1">B</SelectItem>
                <SelectItem value="2">C</SelectItem>
                <SelectItem value="3">D</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="q-explanation">Answer Explanation</Label>
            <Textarea
              id="q-explanation"
              value={questionExplanation}
              onChange={(e) => setQuestionExplanation(e.target.value)}
              rows={2}
              placeholder="Explain why this answer is correct..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onReject}
          disabled={isLoading || slide.status === 'rejected'}
        >
          <X className="h-4 w-4 mr-1" />
          Reject
        </Button>
        <Button
          variant="outline"
          onClick={handleSave}
          disabled={isLoading || !hasChanges}
        >
          <Save className="h-4 w-4 mr-1" />
          Save Draft
        </Button>
        <Button
          onClick={async () => {
            if (hasChanges) await handleSave();
            await onApprove();
          }}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700"
        >
          <Check className="h-4 w-4 mr-1" />
          Approve
        </Button>
      </div>
    </div>
  );
}
