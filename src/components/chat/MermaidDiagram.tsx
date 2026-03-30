import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import {
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Code2,
  Image,
  Download,
  X,
} from 'lucide-react';

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

/** Detect the Mermaid diagram type from the source code */
function detectDiagramType(chart: string): string {
  const first = chart.trim().split('\n')[0].toLowerCase();
  if (first.startsWith('sequencediagram')) return 'Sequence Diagram';
  if (first.startsWith('graph') || first.startsWith('flowchart')) return 'Flowchart';
  if (first.startsWith('classDiagram')) return 'Class Diagram';
  if (first.startsWith('statediagram')) return 'State Diagram';
  if (first.startsWith('erdiagram')) return 'ER Diagram';
  if (first.startsWith('gantt')) return 'Gantt Chart';
  if (first.startsWith('pie')) return 'Pie Chart';
  if (first.startsWith('gitgraph')) return 'Git Graph';
  if (first.startsWith('mindmap')) return 'Mind Map';
  if (first.startsWith('timeline')) return 'Timeline';
  if (first.startsWith('quadrantchart')) return 'Quadrant Chart';
  if (first.startsWith('packet')) return 'Packet Diagram';
  return 'Diagram';
}

interface MermaidDiagramProps {
  chart: string;
}

export const MermaidDiagram = ({ chart }: MermaidDiagramProps) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const idRef = useRef(`mermaid-${++mermaidIdCounter}`);

  const diagramType = detectDiagramType(chart);

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

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(chart);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = chart;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [chart]);

  const handleDownloadSvg = useCallback(() => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${diagramType.toLowerCase().replace(/\s+/g, '-')}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [svg, diagramType]);

  // Close fullscreen on Escape
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isFullscreen]);

  // Toolbar buttons
  const ToolbarButton = ({ onClick, title, children, active }: {
    onClick: () => void;
    title: string;
    children: React.ReactNode;
    active?: boolean;
  }) => (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        active
          ? 'bg-cyan-500/20 text-cyan-400'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
      }`}
    >
      {children}
    </button>
  );

  // Toolbar component (shared between inline and fullscreen)
  const Toolbar = () => (
    <div className="flex items-center gap-1">
      <span className="text-[11px] font-medium text-slate-500 mr-2 hidden sm:inline">
        {diagramType}
      </span>

      <ToolbarButton
        onClick={() => setShowSource(!showSource)}
        title={showSource ? 'View diagram' : 'View source code'}
        active={showSource}
      >
        {showSource ? <Image className="h-3.5 w-3.5" /> : <Code2 className="h-3.5 w-3.5" />}
      </ToolbarButton>

      <ToolbarButton onClick={handleCopy} title="Copy Mermaid source">
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      </ToolbarButton>

      {svg && (
        <ToolbarButton onClick={handleDownloadSvg} title="Download SVG">
          <Download className="h-3.5 w-3.5" />
        </ToolbarButton>
      )}

      <ToolbarButton
        onClick={() => setIsFullscreen(!isFullscreen)}
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
      </ToolbarButton>
    </div>
  );

  // Content renderer (shared between inline and fullscreen)
  const DiagramContent = ({ fullscreen }: { fullscreen?: boolean }) => {
    if (showSource) {
      return (
        <pre className={`overflow-auto font-mono text-sm text-slate-300 bg-slate-950/80 rounded-md p-4 ${
          fullscreen ? '' : 'max-h-[400px]'
        }`}>
          <code>{chart}</code>
        </pre>
      );
    }

    if (error) {
      return (
        <div className="space-y-3">
          <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            Diagram syntax error — showing source code as fallback
          </div>
          <pre className="overflow-auto font-mono text-sm text-slate-300 bg-slate-950/80 rounded-md p-4 max-h-[300px]">
            <code>{chart}</code>
          </pre>
        </div>
      );
    }

    if (!svg) {
      return (
        <div className="py-8 text-center text-slate-500 text-sm">
          <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent mr-2 align-middle" />
          Rendering diagram...
        </div>
      );
    }

    return (
      <div
        className={`overflow-auto ${fullscreen ? '' : 'max-h-[500px]'}`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  };

  // Fullscreen lightbox overlay
  if (isFullscreen) {
    return (
      <>
        {/* Inline placeholder so chat flow isn't disrupted */}
        <div className="my-4 p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-center text-sm text-slate-400">
          Diagram expanded — click anywhere outside or press <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 text-xs">Esc</kbd> to close
        </div>

        {/* Fullscreen overlay */}
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsFullscreen(false);
          }}
        >
          <div className="absolute inset-4 sm:inset-6 lg:inset-10 rounded-xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/60 bg-slate-900/95 shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-sm font-medium text-slate-200">{diagramType}</span>
              </div>
              <div className="flex items-center gap-2">
                <Toolbar />
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/50 ml-2"
                  title="Close (Esc)"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body — fills remaining space */}
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
              <div className="w-full">
                <DiagramContent fullscreen />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Inline rendering
  return (
    <div className="my-4 rounded-lg border border-slate-700/60 bg-slate-900/60 overflow-hidden">
      {/* Toolbar bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/40 bg-slate-800/40">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
          <span className="text-[11px] font-medium text-cyan-400/80 tracking-wide">
            {diagramType.toUpperCase()}
          </span>
        </div>
        <Toolbar />
      </div>

      {/* Content */}
      <div className="p-4">
        <DiagramContent />
      </div>
    </div>
  );
};
