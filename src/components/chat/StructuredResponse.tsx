import { lazy, Suspense } from 'react';
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
import type { StructuredAnswer } from '@/types/chatTypes';

const MermaidDiagram = lazy(() =>
  import('./MermaidDiagram').then(m => ({ default: m.MermaidDiagram }))
);

interface StructuredResponseProps {
  answer: StructuredAnswer;
}

// ── Shared sub-components ────────────────────────────────────────────────────

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
  <div className="my-3 rounded-r-lg border-l-2 border-info bg-info/10 px-3 py-2.5 text-sm">
    <div className="mb-1.5 flex items-center gap-1.5">
      <BookOpen className="h-3.5 w-3.5 shrink-0 text-info" />
      <span className="text-[11px] font-semibold uppercase tracking-wide text-info">ELEC3120 context</span>
    </div>
    <div className="leading-relaxed text-foreground">
      <RenderMarkdown content={text} />
    </div>
  </div>
);

const CheckUnderstanding = ({ text }: { text: string }) => (
  <div className="my-3 rounded-r-lg border-l-2 border-violet-500 bg-violet-500/10 px-3 py-2.5 text-sm">
    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-violet-400">Check your understanding</span>
    <div className="italic leading-relaxed text-foreground">
      <RenderMarkdown content={text} />
    </div>
  </div>
);

const ExamTrapCallout = ({ text }: { text: string }) => (
  <div className="my-3 rounded-r-lg border-l-2 border-warning bg-warning/10 px-3 py-2.5 text-sm">
    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-warning">Exam trap</span>
    <div className="leading-relaxed text-foreground">
      <RenderMarkdown content={text} />
    </div>
  </div>
);

// ── Layout: explain ──────────────────────────────────────────────────────────

const ExplainLayout = ({ answer }: { answer: StructuredAnswer }) => (
  <div className="structured-response space-y-1">
    <h2 className="text-base font-semibold text-primary mt-1 mb-2">{answer.title}</h2>

    {answer.summary && (
      <p className="text-sm text-muted-foreground italic mb-3 leading-relaxed">{answer.summary}</p>
    )}

    <RenderMarkdown content={answer.main_explanation} />

    <ComparisonTable table={answer.table} />

    {answer.diagram && answer.diagram.type === 'mermaid' && answer.diagram.code && (
      <Suspense fallback={
        <div className="my-4 p-4 rounded-lg bg-slate-900/60 border border-slate-700/60 text-center text-slate-400 text-sm">
          <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent mr-2 align-middle" />
          Loading diagram...
        </div>
      }>
        <MermaidDiagram chart={answer.diagram.code} />
      </Suspense>
    )}

    {answer.elec3120_context && <Elec3120Callout text={answer.elec3120_context} />}
    {answer.exam_tip && <ExamTrapCallout text={answer.exam_tip} />}
    {answer.check_understanding && <CheckUnderstanding text={answer.check_understanding} />}
  </div>
);

// ── Layout: exam_focus ───────────────────────────────────────────────────────

const ExamFocusLayout = ({ answer }: { answer: StructuredAnswer }) => (
  <div className="structured-response space-y-1">
    <h2 className="text-base font-semibold text-primary mt-1 mb-2">{answer.title}</h2>

    {/* Compact main explanation — no italic lead since summary is null */}
    <RenderMarkdown content={answer.main_explanation} />

    {/* Table immediately after explanation — key comparison artifact */}
    <ComparisonTable table={answer.table} />

    {answer.elec3120_context && <Elec3120Callout text={answer.elec3120_context} />}

    {answer.check_understanding && <CheckUnderstanding text={answer.check_understanding} />}

    {/* Exam tip styled as a prominent "one-line exam phrasing" footer */}
    {answer.exam_tip && (
      <div className="mt-4 flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-amber-500/40 bg-amber-500/8">
        <GraduationCap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <span className="font-semibold text-amber-400 text-[11px] uppercase tracking-wide block mb-1">One-line exam phrasing</span>
          <div className="text-sm text-foreground leading-snug font-medium">
            <RenderMarkdown content={answer.exam_tip} />
          </div>
        </div>
      </div>
    )}
  </div>
);

// ── Layout: worked_example ───────────────────────────────────────────────────

const WorkedExampleLayout = ({ answer }: { answer: StructuredAnswer }) => {
  const cs = answer.calculation_steps!;
  return (
    <div className="structured-response space-y-1">
      <h2 className="text-base font-semibold text-primary mt-1 mb-2">{answer.title}</h2>

      {/* Intro paragraph — kept short per contract */}
      <p className="text-sm text-muted-foreground italic mb-3 leading-relaxed">
        <RenderMarkdown content={answer.main_explanation} />
      </p>

      {/* Hero: calculation steps */}
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

      {/* Supporting artifacts */}
      <ComparisonTable table={answer.table} />

      {answer.elec3120_context && <Elec3120Callout text={answer.elec3120_context} />}
      {answer.exam_tip && <ExamTrapCallout text={answer.exam_tip} />}
      {answer.check_understanding && <CheckUnderstanding text={answer.check_understanding} />}
    </div>
  );
};

// ── Root ─────────────────────────────────────────────────────────────────────

export const StructuredResponse = ({ answer }: StructuredResponseProps) => {
  if (answer.calculation_steps) {
    return <WorkedExampleLayout answer={answer} />;
  }
  if (answer.exam_tip && answer.elec3120_context && !answer.calculation_steps) {
    return <ExamFocusLayout answer={answer} />;
  }
  return <ExplainLayout answer={answer} />;
};
