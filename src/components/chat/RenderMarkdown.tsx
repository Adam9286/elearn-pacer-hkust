import { ReactNode } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import { Check, X, ThumbsUp, AlertCircle, Lightbulb } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RenderMarkdownProps {
  content: string;
}

// Parse inline elements (bold, italic, inline math, inline code)
const parseInline = (text: string, keyPrefix: string): ReactNode[] => {
  const elements: ReactNode[] = [];
  
  // Regex for inline elements: **bold**, *italic*, `code`, $math$
  const inlineRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\$[^$\n]+\$)/g;
  
  let lastIndex = 0;
  let match;
  let matchIndex = 0;
  
  while ((match = inlineRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      elements.push(
        <span key={`${keyPrefix}-text-${matchIndex}`}>
          {text.slice(lastIndex, match.index)}
        </span>
      );
    }
    
    const matched = match[0];
    
    // Bold: **text**
    if (matched.startsWith('**') && matched.endsWith('**')) {
      elements.push(
        <strong key={`${keyPrefix}-bold-${matchIndex}`} className="font-semibold text-foreground">
          {matched.slice(2, -2)}
        </strong>
      );
    }
    // Italic: *text*
    else if (matched.startsWith('*') && matched.endsWith('*')) {
      elements.push(
        <em key={`${keyPrefix}-italic-${matchIndex}`} className="italic">
          {matched.slice(1, -1)}
        </em>
      );
    }
    // Inline code: `code`
    else if (matched.startsWith('`') && matched.endsWith('`')) {
      elements.push(
        <code
          key={`${keyPrefix}-code-${matchIndex}`}
          className="px-1.5 py-0.5 rounded bg-muted text-primary font-mono text-[0.9em]"
        >
          {matched.slice(1, -1)}
        </code>
      );
    }
    // Inline math: $...$
    else if (matched.startsWith('$') && matched.endsWith('$')) {
      try {
        elements.push(
          <InlineMath key={`${keyPrefix}-math-${matchIndex}`} math={matched.slice(1, -1)} />
        );
      } catch {
        elements.push(
          <span key={`${keyPrefix}-math-err-${matchIndex}`} className="text-destructive text-xs">
            {matched}
          </span>
        );
      }
    }
    
    lastIndex = match.index + matched.length;
    matchIndex++;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    elements.push(
      <span key={`${keyPrefix}-text-end`}>{text.slice(lastIndex)}</span>
    );
  }
  
  return elements.length > 0 ? elements : [<span key={`${keyPrefix}-plain`}>{text}</span>];
};

// Check if a line is an analogy (starts with analogy phrases)
const isAnalogy = (text: string): boolean => {
  const analogyPatterns = /^(Like|Think of|Imagine|Similar to|As if|Picture|Consider|Visualize)/i;
  return analogyPatterns.test(text.trim());
};

// Render special indicators (checkmarks, x marks, thumbs up, etc.)
const renderIndicator = (line: string, key: string): ReactNode | null => {
  const trimmed = line.trim();
  
  // ✅ or ✓ - Correct answer indicator
  if (trimmed.startsWith('✅') || trimmed.startsWith('✓')) {
    return (
      <div key={key} className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 my-4">
        <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
        <span className="text-foreground font-medium">
          {parseInline(trimmed.replace(/^[✅✓]\s*/, ''), key)}
        </span>
      </div>
    );
  }
  
  // ❌ or ✗ - Incorrect answer indicator
  if (trimmed.startsWith('❌') || trimmed.startsWith('✗')) {
    return (
      <div key={key} className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 my-4">
        <X className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        <span className="text-foreground">
          {parseInline(trimmed.replace(/^[❌✗]\s*/, ''), key)}
        </span>
      </div>
    );
  }
  
  // 👍 - Emphasis/confirmation
  if (trimmed.startsWith('👍')) {
    return (
      <div key={key} className="flex items-start gap-2 p-2 rounded-lg bg-primary/10 my-4">
        <ThumbsUp className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <span className="text-foreground text-sm">
          {parseInline(trimmed.replace(/^👍\s*/, ''), key)}
        </span>
      </div>
    );
  }
  
  // ⚠️ - Warning
  if (trimmed.startsWith('⚠️') || trimmed.startsWith('⚠')) {
    return (
      <div key={key} className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 my-4">
        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <span className="text-foreground text-sm">
          {parseInline(trimmed.replace(/^[⚠️⚠]\s*/, ''), key)}
        </span>
      </div>
    );
  }
  
  return null;
};

// Parse markdown table
const parseTable = (lines: string[], startIndex: number): { table: ReactNode; endIndex: number } | null => {
  if (startIndex >= lines.length) return null;
  
  const headerLine = lines[startIndex].trim();
  if (!headerLine.startsWith('|') || !headerLine.endsWith('|')) return null;
  
  // Parse header row
  const headers = headerLine
    .split('|')
    .map(h => h.trim())
    .filter(h => h.length > 0);
  
  if (headers.length === 0) return null;
  
  // Check for separator row
  if (startIndex + 1 >= lines.length) return null;
  const separatorLine = lines[startIndex + 1].trim();
  if (!separatorLine.startsWith('|') || !separatorLine.match(/^\|[\s\-:]+\|/)) return null;
  
  // Parse data rows
  const rows: string[][] = [];
  let rowIndex = startIndex + 2;
  
  while (rowIndex < lines.length) {
    const rowLine = lines[rowIndex].trim();
    if (!rowLine.startsWith('|') || !rowLine.endsWith('|')) break;
    
    const cells = rowLine
      .split('|')
      .map(c => c.trim())
      .filter((c, idx) => idx > 0 && idx < rowLine.split('|').length - 1); // Skip empty first/last
    
    if (cells.length === headers.length) {
      rows.push(cells);
    }
    rowIndex++;
  }
  
  if (rows.length === 0) return null;
  
  // Render table
  const table = (
    <div key={`table-${startIndex}`} className="my-4 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header, idx) => (
              <TableHead key={idx} className="font-semibold">
                {parseInline(header, `table-header-${startIndex}-${idx}`)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIdx) => (
            <TableRow key={rowIdx}>
              {row.map((cell, cellIdx) => (
                <TableCell key={cellIdx}>
                  {parseInline(cell, `table-cell-${startIndex}-${rowIdx}-${cellIdx}`)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
  
  return { table, endIndex: rowIndex };
};

export const RenderMarkdown = ({ content }: RenderMarkdownProps) => {
  if (!content) return null;
  
  const elements: ReactNode[] = [];
  const lines = content.split('\n');
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip empty lines (but preserve paragraph breaks)
    if (!trimmed) {
      i++;
      continue;
    }
    
    // Block math: $$...$$
    if (trimmed.startsWith('$$')) {
      let mathContent = trimmed.slice(2);
      let j = i;
      
      // Multi-line block math
      if (!mathContent.endsWith('$$')) {
        while (j < lines.length - 1 && !lines[j].trim().endsWith('$$')) {
          j++;
          mathContent += '\n' + lines[j].trim();
        }
      }
      
      mathContent = mathContent.replace(/\$\$$/, '').trim();
      
      try {
        elements.push(
          <div key={`block-math-${i}`} className="my-4 overflow-x-auto">
            <BlockMath math={mathContent} />
          </div>
        );
      } catch {
        elements.push(
          <div key={`block-math-err-${i}`} className="text-destructive text-xs my-2">
            Invalid math: {mathContent}
          </div>
        );
      }
      
      i = j + 1;
      continue;
    }
    
    // Headers: ## or ###
    if (trimmed.startsWith('###')) {
      elements.push(
        <h3
          key={`h3-${i}`}
          className="text-base font-semibold text-foreground mt-5 mb-3"
        >
          {parseInline(trimmed.slice(3).trim(), `h3-${i}`)}
        </h3>
      );
      i++;
      continue;
    }
    
    if (trimmed.startsWith('##')) {
      elements.push(
        <h2
          key={`h2-${i}`}
          className="text-lg font-semibold text-primary mt-6 mb-3 pb-2 border-b border-primary/20"
        >
          {parseInline(trimmed.slice(2).trim(), `h2-${i}`)}
        </h2>
      );
      i++;
      continue;
    }
    
    // Horizontal rule: ---
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      elements.push(
        <hr key={`hr-${i}`} className="my-6 border-border/50" />
      );
      i++;
      continue;
    }
    
    // Blockquote: > text
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().slice(1).trim());
        i++;
      }
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-4 border-primary/40 pl-4 py-2 my-4 bg-muted/30 rounded-r-lg italic text-muted-foreground"
        >
          {quoteLines.map((ql, qi) => (
            <p key={qi} className="my-1">
              {parseInline(ql, `quote-${i}-${qi}`)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }
    
    // Special indicators (checkmarks, x marks, etc.)
    const indicator = renderIndicator(line, `indicator-${i}`);
    if (indicator) {
      elements.push(indicator);
      i++;
      continue;
    }
    
    // Markdown table: | col1 | col2 |
    const tableResult = parseTable(lines, i);
    if (tableResult) {
      elements.push(tableResult.table);
      i = tableResult.endIndex;
      continue;
    }
    
    // Unordered list: - item or * item
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const listItems: string[] = [];
      while (
        i < lines.length &&
        (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))
      ) {
        listItems.push(lines[i].trim().slice(2));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="my-4 space-y-2 pl-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span className="text-foreground">{parseInline(item, `li-${i}-${idx}`)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }
    
    // Numbered list: 1. item
    if (/^\d+\.\s/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="my-4 space-y-2 pl-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-primary font-medium text-sm mt-0.5 flex-shrink-0 w-5">
                {idx + 1}.
              </span>
              <span className="text-foreground">{parseInline(item, `oli-${i}-${idx}`)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }
    
    // Code block: ``` (fenced)
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```
      elements.push(
        <pre
          key={`code-block-${i}`}
          className="my-4 p-3 rounded-lg bg-muted overflow-x-auto"
        >
          <code className="text-sm font-mono text-foreground">
            {codeLines.join('\n')}
          </code>
        </pre>
      );
      continue;
    }
    
    // Analogy detection and highlighting
    if (isAnalogy(trimmed)) {
      elements.push(
        <div
          key={`analogy-${i}`}
          className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 my-4"
        >
          <Lightbulb className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-foreground leading-relaxed">
            {parseInline(trimmed, `analogy-${i}`)}
          </p>
        </div>
      );
      i++;
      continue;
    }
    
    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="my-3 text-foreground leading-relaxed">
        {parseInline(trimmed, `p-${i}`)}
      </p>
    );
    i++;
  }
  
  return <div className="chat-markdown space-y-3">{elements}</div>;
};
