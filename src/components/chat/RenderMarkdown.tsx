import { ReactNode } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import { Check, X, ThumbsUp, AlertCircle } from 'lucide-react';

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

// Render special indicators (checkmarks, x marks, thumbs up, etc.)
const renderIndicator = (line: string, key: string): ReactNode | null => {
  const trimmed = line.trim();
  
  // ✅ or ✓ - Correct answer indicator
  if (trimmed.startsWith('✅') || trimmed.startsWith('✓')) {
    return (
      <div key={key} className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 my-2">
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
      <div key={key} className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 my-2">
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
      <div key={key} className="flex items-start gap-2 p-2 rounded-lg bg-primary/10 my-2">
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
      <div key={key} className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 my-2">
        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <span className="text-foreground text-sm">
          {parseInline(trimmed.replace(/^[⚠️⚠]\s*/, ''), key)}
        </span>
      </div>
    );
  }
  
  return null;
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
          className="text-base font-semibold text-foreground mt-4 mb-2"
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
          className="text-lg font-semibold text-primary mt-5 mb-2 pb-1 border-b border-primary/20"
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
        <hr key={`hr-${i}`} className="my-4 border-border/50" />
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
          className="border-l-4 border-primary/40 pl-4 py-2 my-3 bg-muted/30 rounded-r-lg italic text-muted-foreground"
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
        <ul key={`ul-${i}`} className="my-2 space-y-1.5 pl-1">
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
        <ol key={`ol-${i}`} className="my-2 space-y-1.5 pl-1">
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
          className="my-3 p-3 rounded-lg bg-muted overflow-x-auto"
        >
          <code className="text-sm font-mono text-foreground">
            {codeLines.join('\n')}
          </code>
        </pre>
      );
      continue;
    }
    
    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="my-2 text-foreground leading-relaxed">
        {parseInline(trimmed, `p-${i}`)}
      </p>
    );
    i++;
  }
  
  return <div className="chat-markdown space-y-1">{elements}</div>;
};
