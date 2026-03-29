import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Pause,
  StepForward,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from 'lucide-react';
import { SimulationCanvas } from './SimulationCanvas';

// --- Types ---

interface GraphNode {
  id: string;
  x: number;
  y: number;
}

interface Edge {
  from: string;
  to: string;
  cost: number;
}

interface GraphPreset {
  id: string;
  title: string;
  description: string;
  hint: string;
  nodes: GraphNode[];
  edges: Edge[];
  source: string;
}

interface AlgorithmSnapshot {
  distances: Record<string, number>;
  visited: Set<string>;
  previous: Record<string, string | null>;
  currentNode: string | null;
  relaxingEdge: { from: string; to: string } | null;
  narration: string;
  tableRow: { step: number; visitedNode: string; costs: Record<string, number | null> };
}

// --- Presets ---

const PRESETS: GraphPreset[] = [
  {
    id: 'triangle',
    title: 'Simple Triangle',
    description: '3 nodes, the classic intro example',
    hint: 'The direct path A\u2192C costs 4, but going A\u2192B\u2192C costs only 3. Dijkstra finds this!',
    nodes: [
      { id: 'A', x: 100, y: 200 },
      { id: 'B', x: 300, y: 80 },
      { id: 'C', x: 300, y: 320 },
    ],
    edges: [
      { from: 'A', to: 'B', cost: 1 },
      { from: 'B', to: 'C', cost: 2 },
      { from: 'A', to: 'C', cost: 4 },
    ],
    source: 'A',
  },
  {
    id: 'diamond',
    title: 'Diamond Network',
    description: '4 nodes with multiple competing paths',
    hint: 'Watch the algorithm explore cheaper paths first. The shortest to D is A\u2192B\u2192C\u2192D (cost 3), not A\u2192B\u2192D (cost 6).',
    nodes: [
      { id: 'A', x: 80, y: 200 },
      { id: 'B', x: 230, y: 80 },
      { id: 'C', x: 230, y: 320 },
      { id: 'D', x: 380, y: 200 },
    ],
    edges: [
      { from: 'A', to: 'B', cost: 1 },
      { from: 'A', to: 'C', cost: 3 },
      { from: 'B', to: 'D', cost: 5 },
      { from: 'C', to: 'D', cost: 1 },
      { from: 'B', to: 'C', cost: 1 },
    ],
    source: 'A',
  },
  {
    id: 'five-router',
    title: '5-Router Network',
    description: 'A realistic small network with many paths',
    hint: 'A realistic small network. Notice how some nodes get updated multiple times as cheaper paths are discovered.',
    nodes: [
      { id: 'A', x: 80, y: 200 },
      { id: 'B', x: 200, y: 80 },
      { id: 'C', x: 200, y: 320 },
      { id: 'D', x: 340, y: 140 },
      { id: 'E', x: 380, y: 300 },
    ],
    edges: [
      { from: 'A', to: 'B', cost: 2 },
      { from: 'A', to: 'C', cost: 5 },
      { from: 'B', to: 'C', cost: 1 },
      { from: 'B', to: 'D', cost: 4 },
      { from: 'C', to: 'D', cost: 2 },
      { from: 'C', to: 'E', cost: 3 },
      { from: 'D', to: 'E', cost: 1 },
    ],
    source: 'A',
  },
  {
    id: 'linear',
    title: 'Linear Chain',
    description: '5 nodes in a straight line',
    hint: 'The simplest case \u2014 only one path to each node. Watch the algorithm confirm each one.',
    nodes: [
      { id: 'A', x: 60, y: 200 },
      { id: 'B', x: 155, y: 200 },
      { id: 'C', x: 250, y: 200 },
      { id: 'D', x: 345, y: 200 },
      { id: 'E', x: 440, y: 200 },
    ],
    edges: [
      { from: 'A', to: 'B', cost: 1 },
      { from: 'B', to: 'C', cost: 2 },
      { from: 'C', to: 'D', cost: 3 },
      { from: 'D', to: 'E', cost: 4 },
    ],
    source: 'A',
  },
];

// --- Helper: build adjacency list ---

function buildAdjacency(edges: Edge[]): Record<string, { to: string; cost: number }[]> {
  const adj: Record<string, { to: string; cost: number }[]> = {};
  for (const e of edges) {
    if (!adj[e.from]) adj[e.from] = [];
    if (!adj[e.to]) adj[e.to] = [];
    adj[e.from].push({ to: e.to, cost: e.cost });
    adj[e.to].push({ to: e.from, cost: e.cost });
  }
  return adj;
}

// --- Pre-compute all algorithm snapshots ---

function computeSnapshots(preset: GraphPreset): AlgorithmSnapshot[] {
  const { nodes, edges, source } = preset;
  const adj = buildAdjacency(edges);
  const nodeIds = nodes.map((n) => n.id);

  const distances: Record<string, number> = {};
  const visited = new Set<string>();
  const previous: Record<string, string | null> = {};

  for (const id of nodeIds) {
    distances[id] = Infinity;
    previous[id] = null;
  }
  distances[source] = 0;

  const snapshots: AlgorithmSnapshot[] = [];

  // Initial snapshot
  snapshots.push({
    distances: { ...distances },
    visited: new Set(visited),
    previous: { ...previous },
    currentNode: null,
    relaxingEdge: null,
    narration: `Starting at node ${source} (cost=0). All other nodes are \u221E (unreachable so far).`,
    tableRow: {
      step: 0,
      visitedNode: '-',
      costs: Object.fromEntries(nodeIds.map((id) => [id, id === source ? 0 : null])),
    },
  });

  let stepCount = 1;

  while (true) {
    // Find unvisited node with smallest distance
    let minDist = Infinity;
    let minNode: string | null = null;
    for (const id of nodeIds) {
      if (!visited.has(id) && distances[id] < minDist) {
        minDist = distances[id];
        minNode = id;
      }
    }

    if (minNode === null) break;

    // Snapshot: picking the current node
    const neighbors = adj[minNode] || [];
    const unvisitedNeighbors = neighbors.filter((n) => !visited.has(n.to));

    // Process each neighbor with relaxation narration
    const relaxParts: string[] = [];
    const updatedNodes: string[] = [];

    for (const neighbor of unvisitedNeighbors) {
      const newDist = distances[minNode] + neighbor.cost;
      const oldDist = distances[neighbor.to];

      if (newDist < oldDist) {
        relaxParts.push(
          `Checking neighbor ${neighbor.to}: cost ${distances[minNode]}+${neighbor.cost}=${newDist} (better than ${oldDist === Infinity ? '\u221E' : oldDist}, update!)`
        );
        distances[neighbor.to] = newDist;
        previous[neighbor.to] = minNode;
        updatedNodes.push(neighbor.to);
      } else {
        relaxParts.push(
          `Checking neighbor ${neighbor.to}: cost ${distances[minNode]}+${neighbor.cost}=${newDist} (not better than ${oldDist}, skip)`
        );
      }
    }

    visited.add(minNode);

    let narration = '';
    if (unvisitedNeighbors.length === 0) {
      narration = `Node ${minNode} has the lowest unvisited cost (${minDist}). No unvisited neighbors to check.`;
    } else {
      narration = `Processing node ${minNode} (cost=${minDist}). ${relaxParts.join('. ')}.`;
    }

    // Relaxing edge snapshot for each updated neighbor
    if (updatedNodes.length > 0) {
      snapshots.push({
        distances: { ...distances },
        visited: new Set(visited),
        previous: { ...previous },
        currentNode: minNode,
        relaxingEdge: { from: minNode, to: updatedNodes[updatedNodes.length - 1] },
        narration,
        tableRow: {
          step: stepCount,
          visitedNode: minNode,
          costs: Object.fromEntries(
            nodeIds.map((id) => [id, distances[id] === Infinity ? null : distances[id]])
          ),
        },
      });
    } else {
      snapshots.push({
        distances: { ...distances },
        visited: new Set(visited),
        previous: { ...previous },
        currentNode: minNode,
        relaxingEdge: null,
        narration,
        tableRow: {
          step: stepCount,
          visitedNode: minNode,
          costs: Object.fromEntries(
            nodeIds.map((id) => [id, distances[id] === Infinity ? null : distances[id]])
          ),
        },
      });
    }
    stepCount++;
  }

  // Final summary
  const pathSummary = nodeIds
    .filter((id) => id !== source)
    .map((id) => `${id}=${distances[id] === Infinity ? '\u221E' : distances[id]}`)
    .join(', ');

  snapshots.push({
    distances: { ...distances },
    visited: new Set(visited),
    previous: { ...previous },
    currentNode: null,
    relaxingEdge: null,
    narration: `Done! Final shortest paths from ${source}: ${pathSummary}.`,
    tableRow: {
      step: stepCount,
      visitedNode: 'Done',
      costs: Object.fromEntries(
        nodeIds.map((id) => [id, distances[id] === Infinity ? null : distances[id]])
      ),
    },
  });

  return snapshots;
}

// --- Reconstruct shortest path tree edges ---

function getShortestPathEdges(previous: Record<string, string | null>): Set<string> {
  const edgeSet = new Set<string>();
  for (const [node, prev] of Object.entries(previous)) {
    if (prev !== null) {
      const key = [prev, node].sort().join('-');
      edgeSet.add(key);
    }
  }
  return edgeSet;
}

// --- Component ---

export const DijkstraSimulator = () => {
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const preset = PRESETS[selectedPreset];
  const snapshots = useMemo(() => computeSnapshots(preset), [preset]);
  const snapshot = snapshots[currentStep];
  const isComplete = currentStep >= snapshots.length - 1;

  // Auto-play
  useEffect(() => {
    if (isPlaying && !isComplete) {
      intervalRef.current = setInterval(() => {
        setCurrentStep((s) => {
          if (s >= snapshots.length - 1) {
            setIsPlaying(false);
            return s;
          }
          return s + 1;
        });
      }, 1200);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, isComplete, snapshots.length]);

  const handlePresetChange = useCallback((idx: number) => {
    setSelectedPreset(idx);
    setCurrentStep(0);
    setIsPlaying(false);
  }, []);

  const handleStep = useCallback(() => {
    if (currentStep < snapshots.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, snapshots.length]);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, []);

  const handlePlayPause = useCallback(() => {
    if (isComplete) {
      setCurrentStep(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((p) => !p);
    }
  }, [isComplete]);

  // Edge key helper
  const edgeKey = (a: string, b: string) => [a, b].sort().join('-');

  // Shortest path tree edges based on current snapshot
  const spTreeEdges = useMemo(() => getShortestPathEdges(snapshot.previous), [snapshot.previous]);

  // Node position lookup
  const nodePos = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    for (const n of preset.nodes) map[n.id] = { x: n.x, y: n.y };
    return map;
  }, [preset.nodes]);

  // SVG dimensions
  const svgWidth = 500;
  const svgHeight = 400;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Dijkstra Shortest Path Simulator</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Step through shortest-path selection and relaxation, then compare with OSPF-style routing logic.
        </p>
      </div>

      {/* Preset selector */}
      <div>
        <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">Preset Scenarios</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p, idx) => (
            <Button
              key={p.id}
              size="sm"
              variant={selectedPreset === idx ? 'default' : 'outline'}
              onClick={() => handlePresetChange(idx)}
              className="text-xs"
            >
              {p.title}
            </Button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" onClick={handlePlayPause} className="bg-cyan-600 hover:bg-cyan-500 text-white">
          {isPlaying ? (
            <Pause className="h-4 w-4 mr-1" />
          ) : (
            <Play className="h-4 w-4 mr-1" />
          )}
          {isPlaying ? 'Pause' : isComplete ? 'Replay' : 'Play'}
        </Button>
        <Button size="sm" variant="outline" onClick={handleStep} disabled={isComplete || isPlaying} className="border-zinc-300 dark:border-zinc-600/60 text-zinc-900 dark:text-zinc-200">
          <StepForward className="h-4 w-4 mr-1" />
          Step
        </Button>
        <Button size="sm" variant="ghost" onClick={handleReset} className="text-zinc-500 dark:text-zinc-500 hover:text-red-400">
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset
        </Button>
        <Badge variant="secondary" className="ml-auto text-xs">
          Step {currentStep} / {snapshots.length - 1}
        </Badge>
        <Badge variant="outline" className="text-xs">
          Source: {preset.source}
        </Badge>
      </div>

      <SimulationCanvas isLive={isPlaying}>
        <p className="mb-3 text-sm italic text-zinc-600 dark:text-zinc-400">{preset.hint}</p>

        {/* SVG Graph */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-2 overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full"
            style={{ maxHeight: 420, minHeight: 300 }}
          >
            <defs>
              {/* Pulse animation for current node */}
              <style>{`
                @keyframes dijkstra-pulse {
                  0%, 100% { r: 28; opacity: 0.3; }
                  50% { r: 36; opacity: 0; }
                }
              `}</style>
            </defs>

            {/* Edges */}
            {preset.edges.map((edge) => {
              const from = nodePos[edge.from];
              const to = nodePos[edge.to];
              if (!from || !to) return null;

              const key = edgeKey(edge.from, edge.to);
              const isInSPT = spTreeEdges.has(key);
              const isRelaxing =
                snapshot.relaxingEdge &&
                edgeKey(snapshot.relaxingEdge.from, snapshot.relaxingEdge.to) === key;

              let strokeClass = 'stroke-border/50';
              let strokeW = 1.5;

              if (isRelaxing) {
                strokeClass = 'stroke-amber-400';
                strokeW = 3;
              } else if (isInSPT) {
                strokeClass = 'stroke-primary';
                strokeW = 3;
              }

              // Edge midpoint for cost label
              const mx = (from.x + to.x) / 2;
              const my = (from.y + to.y) / 2;
              // Offset label slightly perpendicular to edge
              const dx = to.x - from.x;
              const dy = to.y - from.y;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              const ox = (-dy / len) * 14;
              const oy = (dx / len) * 14;

              return (
                <g key={`edge-${edge.from}-${edge.to}`}>
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    className={`${strokeClass} transition-all duration-300`}
                    strokeWidth={strokeW}
                    strokeLinecap="round"
                  />
                  {/* Cost label */}
                  <rect
                    x={mx + ox - 10}
                    y={my + oy - 9}
                    width={20}
                    height={18}
                    rx={4}
                    className="fill-background/90 stroke-border/30"
                    strokeWidth={0.5}
                  />
                  <text
                    x={mx + ox}
                    y={my + oy + 4}
                    textAnchor="middle"
                    className={`text-[11px] font-mono font-bold ${
                      isRelaxing
                        ? 'fill-amber-400'
                        : isInSPT
                          ? 'fill-primary'
                          : 'fill-muted-foreground'
                    }`}
                  >
                    {edge.cost}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {preset.nodes.map((node) => {
              const isCurrent = snapshot.currentNode === node.id;
              const isVisited = snapshot.visited.has(node.id);
              const dist = snapshot.distances[node.id];
              const distLabel = dist === Infinity ? '\u221E' : String(dist);

              let fillClass = 'fill-zinc-700';
              let strokeClass = 'stroke-zinc-500';
              const textClass = 'fill-zinc-200';

              if (isCurrent) {
                fillClass = 'fill-cyan-500/30';
                strokeClass = 'stroke-cyan-400';
              } else if (isVisited) {
                fillClass = 'fill-emerald-500/30';
                strokeClass = 'stroke-emerald-400';
              }

              return (
                <g key={`node-${node.id}`}>
                  {/* Pulse ring for current */}
                  {isCurrent && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={28}
                      className="fill-none stroke-cyan-400/40"
                      strokeWidth={2}
                      style={{
                        animation: 'dijkstra-pulse 1.2s ease-in-out infinite',
                      }}
                    />
                  )}
                  {/* Node circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={24}
                    className={`${fillClass} ${strokeClass} transition-all duration-300`}
                    strokeWidth={2}
                  />
                  {/* Node label */}
                  <text
                    x={node.x}
                    y={node.y - 3}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={`text-sm font-bold ${textClass} transition-colors duration-300`}
                  >
                    {node.id}
                  </text>
                  {/* Distance label inside node */}
                  <text
                    x={node.x}
                    y={node.y + 12}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={`text-[10px] font-mono ${textClass} transition-colors duration-300`}
                  >
                    {distLabel}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-2 px-2 text-[10px] text-zinc-600 dark:text-zinc-400 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-700/60 border border-zinc-500" />
              Unvisited
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-cyan-500/30 border border-cyan-400" />
              Current
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-emerald-500/30 border border-emerald-400" />
              Visited
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-6 h-0.5 bg-primary" />
              Shortest Path
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-6 h-0.5 bg-amber-400" />
              Relaxing
            </span>
          </div>
        </div>

        {/* Narration */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-3">
          <p className="text-sm text-zinc-900 dark:text-zinc-200 leading-relaxed">
            <span className="font-semibold text-foreground">Step {currentStep}:</span> {snapshot.narration}
          </p>
        </div>

        {/* Algorithm Table */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50">
                <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400">Step</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400">Visited</th>
                {preset.nodes.map((n) => (
                  <th key={n.id} className="px-3 py-2 text-center font-semibold text-zinc-600 dark:text-zinc-400">
                    Cost to {n.id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {snapshots.slice(0, currentStep + 1).map((snap, idx) => {
                const isCurrent = idx === currentStep;
                return (
                  <tr
                    key={idx}
                    className={`border-b border-border/30 transition-colors ${
                      isCurrent ? 'bg-primary/10' : 'bg-transparent'
                    }`}
                  >
                    <td className="px-3 py-1.5 font-mono text-zinc-600 dark:text-zinc-400">{snap.tableRow.step}</td>
                    <td className="px-3 py-1.5 font-mono text-zinc-600 dark:text-zinc-400">{snap.tableRow.visitedNode}</td>
                    {preset.nodes.map((n) => {
                      const val = snap.tableRow.costs[n.id];
                      const isFinalized = snap.visited.has(n.id);
                      return (
                        <td
                          key={n.id}
                          className={`px-3 py-1.5 text-center font-mono ${
                            isFinalized
                              ? 'text-emerald-400'
                              : val !== null
                                ? 'text-foreground'
                                : 'text-zinc-600/50 dark:text-zinc-400/50'
                          }`}
                        >
                          {val !== null ? val : '\u221E'}
                          {isFinalized && val !== null && <span className="ml-1 text-emerald-400">\u2713</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Reading Guide (collapsible) */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50">
          <button className="w-full flex items-center justify-between p-4 text-left" onClick={() => setShowGuide(!showGuide)}>
            <span className="text-sm font-semibold text-foreground">Reading Guide</span>
            {showGuide ? (
              <ChevronUp className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            )}
          </button>

          {showGuide && (
            <div className="px-4 pb-4 space-y-4">
              {/* Key Concepts */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Key Concepts</p>
                <div className="space-y-1.5 text-sm text-zinc-900 dark:text-zinc-200">
                  <p>
                    <span className="font-semibold text-primary">Greedy Algorithm</span>: Always process the unvisited node with
                    the smallest known cost. This guarantees optimality.
                  </p>
                  <p>
                    <span className="font-semibold text-amber-400">Relaxation</span>: When we find a shorter path to a node, we
                    &ldquo;relax&rdquo; (update) its cost. Watch for nodes whose cost decreases.
                  </p>
                  <p>
                    <span className="font-semibold text-emerald-400">Shortest Path Tree</span>: The set of edges forming the
                    cheapest routes from the source to all other nodes.
                  </p>
                  <p>
                    <span className="font-semibold text-indigo-400">OSPF Connection</span>: Real routers use Dijkstra&apos;s
                    algorithm in the OSPF protocol. Each router runs this independently with link costs as weights.
                  </p>
                </div>
              </div>

              {/* OSPF note */}
              <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                <p className="text-xs font-semibold text-foreground mb-1">How OSPF uses this</p>
                <p className="text-sm text-zinc-900 dark:text-zinc-200 leading-relaxed">
                  In OSPF (Open Shortest Path First), every router learns the full network topology via Link-State Advertisements.
                  Then each router independently runs Dijkstra&apos;s algorithm to build its own routing table &mdash; exactly what
                  you&apos;re seeing in this simulator.
                </p>
              </div>

              {/* Try this */}
              <div className="flex items-start gap-2 rounded-md border border-amber-400/20 bg-amber-500/5 p-3">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <p className="text-sm text-zinc-900 dark:text-zinc-200 leading-relaxed">
                  <span className="font-semibold text-amber-400">Try this:</span> In the Diamond Network, predict the shortest path
                  to D before running. Then step through and see if you&apos;re right!
                </p>
              </div>
            </div>
          )}
        </div>
      </SimulationCanvas>
    </div>
  );
};

export default DijkstraSimulator;



