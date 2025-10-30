import { InlineMath, BlockMath } from 'react-katex';

interface RenderMathProps {
  text: string;
}

export const RenderMath = ({ text }: RenderMathProps) => {
  // Regex pattern that captures:
  // - $$...$$ as block math (allows newlines and multiline expressions)
  // - $...$ as inline math (single line)
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;

        // Block math: $$...$$
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const latex = part.slice(2, -2).trim();
          try {
            return (
              <div key={i} className="my-3">
                <BlockMath math={latex} />
              </div>
            );
          } catch (error) {
            return (
              <span key={i} className="text-red-500 text-xs">
                Invalid math: {part}
              </span>
            );
          }
        }

        // Inline math: $...$
        if (part.startsWith('$') && part.endsWith('$')) {
          const latex = part.slice(1, -1);
          try {
            return <InlineMath key={i} math={latex} />;
          } catch (error) {
            return (
              <span key={i} className="text-red-500 text-xs">
                Invalid math: {part}
              </span>
            );
          }
        }

        // Plain text
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};
