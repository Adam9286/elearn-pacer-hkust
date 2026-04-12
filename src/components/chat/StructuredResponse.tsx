import { lazy, Suspense } from 'react';
import { Lightbulb, BookOpen, HelpCircle, Calculator, AlertTriangle } from 'lucide-react';
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

/**
 * Renders a structured JSON response from the n8n agent.
 * Each section is rendered conditionally — null/undefined fields are silently omitted.
 * Falls back to RenderMarkdown for all prose fields so bold, inline math, lists, etc.
 * all render correctly.
 */
export const StructuredResponse = ({ answer }: StructuredResponseProps) => {
  return (
    <div className="structured-response space-y-1">

      {/* ── Title ── */}
      <h2 className="text-base font-semibold text-primary mt-1 mb-2">
        {answer.title}
      </h2>

      {/* ── Optional summary ── */}
      {answer.summary && (
        <p className="text-sm text-muted-foreground italic mb-3 leading-relaxed">
          {answer.summary}
        </p>
      )}

      {/* ── Main explanation ── */}
      <RenderMarkdown content={answer.main_explanation} />

      {/* ── Calculation steps ── */}
      {answer.calculation_steps && (
        <div className="my-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm">
            <Calculator className="w-4 h-4" />
            Step-by-Step Solution
          </div>
          <div className="text-sm italic text-muted-foreground leading-relaxed">
            <RenderMarkdown content={answer.calculation_steps.setup} />
          </div>
          <ol className="space-y-1.5 text-sm">
            {answer.calculation_steps.steps.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-mono text-primary w-5 shrink-0 mt-0.5">{i + 1}.</span>
                <div className="text-foreground leading-relaxed min-w-0 flex-1">
                  <RenderMarkdown content={step} />
                </div>
              </li>
            ))}
          </ol>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 font-semibold text-foreground text-sm">
            <RenderMarkdown content={`**Answer:** ${answer.calculation_steps.answer}`} />
          </div>
          {answer.calculation_steps.common_mistakes && (
            <div className="flex gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div className="text-foreground leading-relaxed min-w-0 flex-1">
                <RenderMarkdown content={`**Common mistake:** ${answer.calculation_steps.common_mistakes}`} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Comparison table ── */}
      {answer.table && answer.table.headers.length > 0 && (
        <div className="my-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {answer.table.headers.map((h, i) => (
                  <TableHead key={i} className="font-semibold">
                    <RenderMarkdown content={h} />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {answer.table.rows.map((row, ri) => (
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
      )}

      {/* ── Mermaid diagram ── */}
      {answer.diagram && answer.diagram.type === 'mermaid' && answer.diagram.code && (
        <Suspense
          fallback={
            <div className="my-4 p-4 rounded-lg bg-slate-900/60 border border-slate-700/60 text-center text-slate-400 text-sm">
              <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent mr-2 align-middle" />
              Loading diagram...
            </div>
          }
        >
          <MermaidDiagram chart={answer.diagram.code} />
        </Suspense>
      )}

      {/* ── ELEC3120 context ── */}
      {answer.elec3120_context && (
        <div className="flex gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 my-3 text-sm">
          <BookOpen className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <div className="text-foreground leading-relaxed min-w-0 flex-1">
            <RenderMarkdown content={answer.elec3120_context} />
          </div>
        </div>
      )}

      {/* ── Exam tip ── */}
      {answer.exam_tip && (
        <div className="flex gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 my-3 text-sm">
          <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
          <div className="text-foreground leading-relaxed min-w-0 flex-1">
            <RenderMarkdown content={`**Exam tip:** ${answer.exam_tip}`} />
          </div>
        </div>
      )}

      {/* ── Check your understanding ── */}
      {answer.check_understanding && (
        <div className="flex gap-2 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20 my-3 text-sm">
          <HelpCircle className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-foreground block mb-1">
              Check Your Understanding
            </span>
            <div className="italic text-foreground leading-relaxed">
              <RenderMarkdown content={answer.check_understanding} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
