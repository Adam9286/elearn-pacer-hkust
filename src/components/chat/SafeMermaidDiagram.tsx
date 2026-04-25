import { Component, Suspense, lazy, type ErrorInfo, type ReactNode } from 'react';

const MermaidDiagram = lazy(() =>
  import('./MermaidDiagram').then((m) => ({ default: m.MermaidDiagram }))
);

interface SafeMermaidDiagramProps {
  chart: string;
}

interface MermaidBoundaryProps extends SafeMermaidDiagramProps {
  children: ReactNode;
}

interface MermaidBoundaryState {
  hasError: boolean;
}

const LoadingFallback = () => (
  <div className="my-4 p-4 rounded-lg bg-slate-900/60 border border-slate-700/60 text-center text-slate-400 text-sm">
    <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent mr-2 align-middle" />
    Loading diagram...
  </div>
);

const SourceFallback = ({ chart, reason }: { chart: string; reason: string }) => (
  <div className="my-4 space-y-3 rounded-lg border border-slate-700/60 bg-slate-900/60 p-4">
    <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
      {reason}
    </div>
    <pre className="overflow-auto rounded-md bg-slate-950/80 p-4 font-mono text-sm text-slate-300">
      <code>{chart}</code>
    </pre>
  </div>
);

class MermaidErrorBoundary extends Component<MermaidBoundaryProps, MermaidBoundaryState> {
  state: MermaidBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MermaidBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[mermaid boundary] failed to render diagram', {
      error,
      componentStack: info.componentStack,
    });
  }

  componentDidUpdate(prevProps: MermaidBoundaryProps) {
    if (this.state.hasError && prevProps.chart !== this.props.chart) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <SourceFallback
          chart={this.props.chart}
          reason="Diagram rendering failed in the UI, so the Mermaid source is shown instead."
        />
      );
    }

    return this.props.children;
  }
}

export const SafeMermaidDiagram = ({ chart }: SafeMermaidDiagramProps) => (
  <MermaidErrorBoundary chart={chart}>
    <Suspense fallback={<LoadingFallback />}>
      <MermaidDiagram chart={chart} />
    </Suspense>
  </MermaidErrorBoundary>
);
