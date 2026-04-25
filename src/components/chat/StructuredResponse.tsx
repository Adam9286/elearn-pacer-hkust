import { BookOpen, Calculator, GraduationCap } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RenderMarkdown } from './RenderMarkdown';
import { SafeMermaidDiagram } from './SafeMermaidDiagram';
import { normalizeChatResponseStyle, type StructuredAnswer } from '@/types/chatTypes';

interface StructuredResponseProps {
  answer: StructuredAnswer;
}

const MermaidBlock = ({ answer }: { answer: StructuredAnswer }) => {
  if (!answer.diagram || answer.diagram.type !== 'mermaid' || !answer.diagram.code) return null;

  return <SafeMermaidDiagram chart={answer.diagram.code} />;
};

const ComparisonTable = ({ table }: { table: StructuredAnswer['table'] }) => {
  if (!table || table.headers.length === 0) return null;

  return (
    <div className="my-4 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {table.headers.map((h, i) => (
              <TableHead key={i} className="font-semibold">
                <RenderMarkdown content={h} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.rows.map((row, ri) => (
            <TableRow key={ri}>
              {row.map((cell, ci) => (
                <TableCell key={ci}>
                  <RenderMarkdown content={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const Elec3120Callout = ({ text }: { text: string }) => (
  <div className="my-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm">
    <div className="mb-1 flex items-center gap-1.5">
      <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">ELEC3120 context</span>
    </div>
    <div className="leading-relaxed text-foreground/90">
      <RenderMarkdown content={text} />
    </div>
  </div>
);

const CheckUnderstanding = ({ text }: { text: string }) => (
  <div className="my-3 rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-sm">
    <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-violet-400/90">Check your understanding</span>
    <div className="leading-relaxed text-foreground/90">
      <RenderMarkdown content={text} />
    </div>
  </div>
);

const ExamTipCallout = ({ text, compact = false }: { text: string; compact?: boolean }) => {
  if (compact) {
    return (
      <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2">
        <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/90" />
        <div className="min-w-0">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-amber-400/90">Exam wording</span>
          <div className="text-sm leading-snug text-foreground/90">
            <RenderMarkdown content={text} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-3 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-sm">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-amber-400/90">Exam tip</span>
      <div className="leading-relaxed text-foreground/90">
        <RenderMarkdown content={text} />
      </div>
    </div>
  );
};

const CalculationStepsBlock = ({ steps: cs }: { steps: NonNullable<StructuredAnswer['calculation_steps']> }) => (
  <div className="my-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm">
      <Calculator className="w-4 h-4" />
      Step-by-Step Solution
    </div>

    <div className="text-sm italic text-muted-foreground leading-relaxed">
      <RenderMarkdown content={cs.setup} />
    </div>

    <ol className="space-y-1.5 text-sm">
      {cs.steps.map((step, i) => (
        <li key={i} className="flex gap-2">
          <span className="font-mono text-primary w-5 shrink-0 mt-0.5">{i + 1}.</span>
          <div className="text-foreground leading-relaxed min-w-0 flex-1">
            <RenderMarkdown content={step} />
          </div>
        </li>
      ))}
    </ol>

    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 font-semibold text-foreground text-sm">
      <RenderMarkdown content={`**Answer:** ${cs.answer}`} />
    </div>

    {cs.common_mistakes && (
      <div className="pl-3 pr-3 py-2.5 rounded-r-lg border-l-2 border-red-500 bg-red-500/8 text-sm">
        <span className="font-semibold text-red-400 text-[11px] uppercase tracking-wide block mb-1">Common mistake</span>
        <div className="text-foreground leading-relaxed">
          <RenderMarkdown content={cs.common_mistakes} />
        </div>
      </div>
    )}
  </div>
);

const AnswerArtifacts = ({ answer, compactExamTip = false }: {
  answer: StructuredAnswer;
  compactExamTip?: boolean;
}) => (
  <>
    <ComparisonTable table={answer.table} />
    <MermaidBlock answer={answer} />
    {answer.calculation_steps && <CalculationStepsBlock steps={answer.calculation_steps} />}
    {answer.elec3120_context && <Elec3120Callout text={answer.elec3120_context} />}
    {answer.exam_tip && <ExamTipCallout text={answer.exam_tip} compact={compactExamTip} />}
    {answer.check_understanding && <CheckUnderstanding text={answer.check_understanding} />}
  </>
);

const QuickAnswerLayout = ({ answer }: { answer: StructuredAnswer }) => (
  <div className="structured-response space-y-2">
    <h2 className="mt-1 text-[15px] font-semibold text-foreground">{answer.title}</h2>

    {answer.summary && (
      <p className="mb-2 text-sm leading-relaxed text-muted-foreground">{answer.summary}</p>
    )}

    <RenderMarkdown content={answer.main_explanation} />
    <AnswerArtifacts answer={answer} compactExamTip />
  </div>
);

const FullExplanationLayout = ({ answer }: { answer: StructuredAnswer }) => (
  <div className="structured-response space-y-2">
    <h2 className="mt-1 text-base font-semibold text-primary">{answer.title}</h2>

    {answer.summary && (
      <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{answer.summary}</p>
    )}

    <RenderMarkdown content={answer.main_explanation} />
    <AnswerArtifacts answer={answer} />
  </div>
);

export const StructuredResponse = ({ answer }: StructuredResponseProps) => {
  const responseStyle = normalizeChatResponseStyle(answer.response_style);
  return responseStyle === 'quick_answer'
    ? <QuickAnswerLayout answer={answer} />
    : <FullExplanationLayout answer={answer} />;
};
