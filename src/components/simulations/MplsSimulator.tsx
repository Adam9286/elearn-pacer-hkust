import { useMemo, useState } from 'react';
import { ArrowRight, Play, RotateCcw, SkipForward } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SimulationCanvas } from './SimulationCanvas';

interface MplsHeader {
  label: number;
  cos: number;
  s: number;
  ttl: number;
}

interface IpPacket {
  sourceIp: string;
  destinationIp: string;
  payload: string;
}

type StageId = 0 | 1 | 2 | 3;

interface PacketView {
  location: string;
  action: string;
  interfaceIn: string;
  interfaceOut: string;
  mplsHeader: MplsHeader | null;
  ipPacket: IpPacket;
  notes: string;
}

interface LfibEntry {
  router: string;
  interfaceIn: string;
  labelIn: number;
  interfaceOut: string;
  labelOut: number | 'POP';
}

const STAGE_LABELS: Record<StageId, string> = {
  0: 'IP Arrives At Ingress LER',
  1: 'Ingress LER PUSH',
  2: 'Transit LSR SWAP',
  3: 'Egress LER POP',
};

const PATH_NODES = ['Ingress LER (R1)', 'Transit LSR (R2)', 'Egress LER (R3)'] as const;

const INGRESS_LABEL = 160;
const TRANSIT_LABEL = 240;

const LFIB: LfibEntry[] = [
  {
    router: 'Transit LSR (R2)',
    interfaceIn: 'core-in',
    labelIn: INGRESS_LABEL,
    interfaceOut: 'core-out',
    labelOut: TRANSIT_LABEL,
  },
  {
    router: 'Egress LER (R3)',
    interfaceIn: 'edge-in',
    labelIn: TRANSIT_LABEL,
    interfaceOut: 'lan-out',
    labelOut: 'POP',
  },
];

const basePacket: IpPacket = {
  sourceIp: '10.1.1.10',
  destinationIp: '10.9.9.20',
  payload: 'HTTP segment',
};

const clampCos = (value: number) => Math.min(7, Math.max(0, value));
const clampTtl = (value: number) => Math.min(255, Math.max(1, value));

const headerBits = (header: MplsHeader) => {
  const labelBits = header.label.toString(2).padStart(20, '0');
  const cosBits = header.cos.toString(2).padStart(3, '0');
  const sBits = header.s.toString(2).padStart(1, '0');
  const ttlBits = header.ttl.toString(2).padStart(8, '0');
  return `${labelBits} ${cosBits} ${sBits} ${ttlBits}`;
};

export const MplsSimulator = () => {
  const [cos, setCos] = useState(3);
  const [ttl, setTtl] = useState(64);
  const [stage, setStage] = useState<StageId>(0);
  const [eventLog, setEventLog] = useState<string[]>([]);

  const ingressHeader = useMemo<MplsHeader>(
    () => ({
      label: INGRESS_LABEL,
      cos: clampCos(cos),
      s: 1,
      ttl: clampTtl(ttl),
    }),
    [cos, ttl]
  );

  const transitHeader = useMemo<MplsHeader>(
    () => ({
      label: TRANSIT_LABEL,
      cos: ingressHeader.cos,
      s: 1,
      ttl: Math.max(1, ingressHeader.ttl - 1),
    }),
    [ingressHeader]
  );

  const packetView = useMemo<PacketView>(() => {
    if (stage === 0) {
      return {
        location: 'Customer Edge -> Ingress LER (R1)',
        action: 'Unlabeled IP forwarding to ingress edge',
        interfaceIn: 'ce-in',
        interfaceOut: 'core-out',
        mplsHeader: null,
        ipPacket: basePacket,
        notes: 'Ingress has not pushed an MPLS header yet.',
      };
    }

    if (stage === 1) {
      return {
        location: 'Ingress LER (R1) -> Transit LSR (R2)',
        action: 'PUSH label and send into LSP',
        interfaceIn: 'ce-in',
        interfaceOut: 'core-out',
        mplsHeader: ingressHeader,
        ipPacket: basePacket,
        notes: 'Ingress LER encapsulates the IP packet with a 32-bit MPLS header.',
      };
    }

    if (stage === 2) {
      return {
        location: 'Transit LSR (R2) -> Egress LER (R3)',
        action: 'SWAP label using LFIB: (Interface In, Label In) -> (Interface Out, Label Out)',
        interfaceIn: 'core-in',
        interfaceOut: 'core-out',
        mplsHeader: transitHeader,
        ipPacket: basePacket,
        notes: `Transit does not inspect destination prefix; it swaps ${INGRESS_LABEL} -> ${TRANSIT_LABEL}.`,
      };
    }

    return {
      location: 'Egress LER (R3) -> Destination LAN',
      action: 'POP label and restore plain IP packet',
      interfaceIn: 'edge-in',
      interfaceOut: 'lan-out',
      mplsHeader: null,
      ipPacket: basePacket,
      notes: 'Egress removes MPLS label and forwards original IP packet onward.',
    };
  }, [ingressHeader, stage, transitHeader]);

  const logStage = (nextStage: StageId) => {
    const lineByStage: Record<StageId, string> = {
      0: 'Stage 0: Unlabeled IP packet arrives at ingress LER.',
      1: `Stage 1: Ingress PUSH label=${INGRESS_LABEL}, CoS=${ingressHeader.cos}, S=1, TTL=${ingressHeader.ttl}.`,
      2: `Stage 2: Transit SWAP via LFIB (core-in, ${INGRESS_LABEL}) -> (core-out, ${TRANSIT_LABEL}).`,
      3: 'Stage 3: Egress POP removes label and restores plain IP forwarding.',
    };
    setEventLog((prev) => [lineByStage[nextStage], ...prev].slice(0, 12));
  };

  const nextStage = () => {
    if (stage >= 3) return;
    const updated = (stage + 1) as StageId;
    setStage(updated);
    logStage(updated);
  };

  const runFullPath = () => {
    setStage(3);
    setEventLog((prev) => [
      'Run complete: ingress PUSH -> transit SWAP -> egress POP along one-way LSP R1->R2->R3.',
      ...prev,
    ].slice(0, 12));
  };

  const reset = () => {
    setCos(3);
    setTtl(64);
    setStage(0);
    setEventLog([]);
  };

  const pathActiveIndex = stage === 0 ? 0 : stage === 1 ? 1 : stage === 2 ? 2 : 2;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">MPLS Label Switching Simulator</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Emulate a virtual circuit (LSP): ingress PUSH, transit SWAP by label/interface mapping, egress POP.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-900/95 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">LSP Controls</h3>
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">
            CoS (3 bits)
            <input
              type="number"
              min={0}
              max={7}
              value={cos}
              onChange={(event) => setCos(clampCos(Number(event.target.value) || 0))}
              className="ml-2 h-9 w-20 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            />
          </label>
          <label className="text-sm text-zinc-600 dark:text-zinc-400">
            TTL (8 bits)
            <input
              type="number"
              min={1}
              max={255}
              value={ttl}
              onChange={(event) => setTtl(clampTtl(Number(event.target.value) || 1))}
              className="ml-2 h-9 w-24 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            />
          </label>
          <Badge className="bg-primary/10 text-primary border-primary/30">Current Stage: {STAGE_LABELS[stage]}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={nextStage} disabled={stage === 3} className="gap-2 bg-cyan-600 hover:bg-cyan-500 text-white">
            <Play className="h-4 w-4" />
            Next Step
          </Button>
          <Button onClick={runFullPath} disabled={stage === 3} variant="outline" className="gap-2 border-zinc-300 dark:border-zinc-600/60 text-zinc-900 dark:text-zinc-200">
            <SkipForward className="h-4 w-4" />
            Run Full LSP
          </Button>
          <Button onClick={reset} variant="ghost" className="gap-2 text-zinc-500 dark:text-zinc-500 hover:text-red-400">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      <SimulationCanvas isLive={stage > 0}>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-900/95 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">One-Way LSP Path</h3>
          <div className="flex flex-wrap items-center gap-2">
            {PATH_NODES.map((node, index) => (
              <div key={node} className="flex items-center gap-2">
                <div
                  className={`rounded-md border px-3 py-1.5 text-xs ${
                    index <= pathActiveIndex
                      ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
                      : 'border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {node}
                </div>
                {index < PATH_NODES.length - 1 && <ArrowRight className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-900/95 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Packet At Current Stage</h3>
          <div className="text-sm text-zinc-900 dark:text-zinc-200">Location: {packetView.location}</div>
          <div className="text-sm text-zinc-900 dark:text-zinc-200">Action: {packetView.action}</div>
          <div className="text-sm text-zinc-900 dark:text-zinc-200">
            Interface In/Out: {packetView.interfaceIn} {'->'} {packetView.interfaceOut}
          </div>

          {packetView.mplsHeader ? (
            <div className="rounded border border-blue-500/50 bg-blue-500/10 p-3 space-y-2">
              <div className="text-xs font-semibold text-foreground">MPLS Header (32 bits, encapsulated)</div>
              <div className="grid gap-1 text-xs text-zinc-600 dark:text-zinc-400 md:grid-cols-4">
                <div>
                  Label (20): <span className="font-mono text-foreground">{packetView.mplsHeader.label}</span>
                </div>
                <div>
                  CoS (3): <span className="font-mono text-foreground">{packetView.mplsHeader.cos}</span>
                </div>
                <div>
                  S (1): <span className="font-mono text-foreground">{packetView.mplsHeader.s}</span>
                </div>
                <div>
                  TTL (8): <span className="font-mono text-foreground">{packetView.mplsHeader.ttl}</span>
                </div>
              </div>
              <div className="text-xs font-mono text-zinc-600 dark:text-zinc-400 break-all">{headerBits(packetView.mplsHeader)}</div>
            </div>
          ) : (
            <div className="rounded border border-amber-500/50 bg-amber-500/10 p-3 text-xs text-zinc-600 dark:text-zinc-400">
              No MPLS header on packet at this stage (plain IP forwarding).
            </div>
          )}

          <div className="rounded border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-3 text-sm text-zinc-900 dark:text-zinc-200">
            Restored IP packet: {packetView.ipPacket.sourceIp} {'->'} {packetView.ipPacket.destinationIp} ({packetView.ipPacket.payload})
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">{packetView.notes}</div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">LFIB Mapping Table</h3>
          <div className="grid grid-cols-5 gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            <div>Router</div>
            <div>Interface In</div>
            <div>Label In</div>
            <div>Interface Out</div>
            <div>Label Out</div>
          </div>
          {LFIB.map((entry) => {
            const activeTransit =
              (stage === 2 && entry.router.includes('Transit')) || (stage === 3 && entry.router.includes('Egress'));
            return (
              <div
                key={`${entry.router}-${entry.interfaceIn}-${entry.labelIn}`}
                className={`grid grid-cols-5 gap-2 rounded border px-2 py-2 text-xs ${
                  activeTransit
                    ? 'border-emerald-500/60 bg-emerald-500/10'
                    : 'border-border/50 bg-muted/20'
                }`}
              >
                <div className="text-foreground">{entry.router}</div>
                <div className="font-mono text-zinc-600 dark:text-zinc-400">{entry.interfaceIn}</div>
                <div className="font-mono text-zinc-600 dark:text-zinc-400">{entry.labelIn}</div>
                <div className="font-mono text-zinc-600 dark:text-zinc-400">{entry.interfaceOut}</div>
                <div className="font-mono text-zinc-600 dark:text-zinc-400">{entry.labelOut}</div>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Event Log</h3>
          {eventLog.length === 0 ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-400">No events yet. Step through the LSP to record PUSH/SWAP/POP actions.</div>
          ) : (
            eventLog.map((line) => (
              <div key={line} className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                {line}
              </div>
            ))
          )}
        </div>
      </SimulationCanvas>
    </div>
  );
};



