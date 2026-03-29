import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#6366f1',
    primaryTextColor: '#e2e8f0',
    primaryBorderColor: '#818cf8',
    lineColor: '#94a3b8',
    secondaryColor: '#1e293b',
    tertiaryColor: '#0f172a',
    noteBkgColor: '#1e293b',
    noteTextColor: '#e2e8f0',
    actorBkg: '#6366f1',
    actorTextColor: '#ffffff',
    actorLineColor: '#94a3b8',
    signalColor: '#e2e8f0',
    signalTextColor: '#e2e8f0',
  },
  securityLevel: 'strict',
  fontFamily: 'inherit',
});

let mermaidIdCounter = 0;

interface MermaidDiagramProps {
  chart: string;
}

export const MermaidDiagram = ({ chart }: MermaidDiagramProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(`mermaid-${++mermaidIdCounter}`);

  useEffect(() => {
    let cancelled = false;

    const renderDiagram = async () => {
      try {
        const { svg: renderedSvg } = await mermaid.render(idRef.current, chart.trim());
        if (!cancelled) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
          setSvg('');
        }
      }
    };

    renderDiagram();
    return () => { cancelled = true; };
  }, [chart]);

  if (error) {
    return (
      <div className="my-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
        Diagram error: {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-4 p-4 rounded-lg bg-muted/30 border border-border/50 text-center text-muted-foreground text-sm">
        Rendering diagram...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-4 p-4 rounded-lg bg-slate-900/50 border border-border/50 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
