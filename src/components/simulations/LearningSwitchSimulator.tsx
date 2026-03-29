import { useCallback, useMemo, useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SimulationCanvas } from './SimulationCanvas';

type HostId = 'H1' | 'H2' | 'H3' | 'H4';

interface HostInfo {
  id: HostId;
  mac: string;
  port: number;
}

interface Frame {
  source: HostId;
  destination: HostId;
}

interface MacEntry {
  mac: string;
  port: number;
  lastSeenFrame: number;
}

interface FrameResult {
  ingressPort: number;
  learnedSourceMac: string;
  learnedPort: number;
  action: 'flood' | 'forward' | 'filter';
  outputPorts: number[];
  message: string;
}

const HOSTS: HostInfo[] = [
  { id: 'H1', mac: '00:AA:00:00:00:01', port: 1 },
  { id: 'H2', mac: '00:AA:00:00:00:02', port: 2 },
  { id: 'H3', mac: '00:AA:00:00:00:03', port: 3 },
  { id: 'H4', mac: '00:AA:00:00:00:04', port: 4 },
];

const DEMO_SEQUENCE: Frame[] = [
  { source: 'H1', destination: 'H3' },
  { source: 'H3', destination: 'H1' },
  { source: 'H2', destination: 'H1' },
  { source: 'H4', destination: 'H3' },
];

const hostById = (id: HostId) => HOSTS.find((host) => host.id === id)!;

const buildUnknownFloodPorts = (ingressPort: number) =>
  HOSTS.map((host) => host.port).filter((port) => port !== ingressPort);

export const LearningSwitchSimulator = () => {
  const [macTable, setMacTable] = useState<Record<string, MacEntry>>({});
  const [selectedSource, setSelectedSource] = useState<HostId>('H1');
  const [selectedDestination, setSelectedDestination] = useState<HostId>('H3');
  const [frameCount, setFrameCount] = useState(0);
  const [lastResult, setLastResult] = useState<FrameResult | null>(null);
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [demoStepIndex, setDemoStepIndex] = useState(0);

  const processFrame = useCallback(
    (frame: Frame) => {
      const sourceHost = hostById(frame.source);
      const destinationHost = hostById(frame.destination);
      const nextFrameNumber = frameCount + 1;
      const nextTable = { ...macTable };

      // Learning behavior: always learn/update source MAC on ingress port.
      nextTable[sourceHost.mac] = {
        mac: sourceHost.mac,
        port: sourceHost.port,
        lastSeenFrame: nextFrameNumber,
      };

      const destinationEntry = nextTable[destinationHost.mac];
      let result: FrameResult;

      if (!destinationEntry) {
        const floodPorts = buildUnknownFloodPorts(sourceHost.port);
        result = {
          ingressPort: sourceHost.port,
          learnedSourceMac: sourceHost.mac,
          learnedPort: sourceHost.port,
          action: 'flood',
          outputPorts: floodPorts,
          message: `Unknown destination ${destinationHost.mac}. Flood out ports ${floodPorts.join(', ')}.`,
        };
      } else if (destinationEntry.port === sourceHost.port) {
        result = {
          ingressPort: sourceHost.port,
          learnedSourceMac: sourceHost.mac,
          learnedPort: sourceHost.port,
          action: 'filter',
          outputPorts: [],
          message: `Destination ${destinationHost.mac} is on ingress port ${sourceHost.port}. Filter frame (no forwarding).`,
        };
      } else {
        result = {
          ingressPort: sourceHost.port,
          learnedSourceMac: sourceHost.mac,
          learnedPort: sourceHost.port,
          action: 'forward',
          outputPorts: [destinationEntry.port],
          message: `Destination ${destinationHost.mac} learned on port ${destinationEntry.port}. Forward unicast only to that port.`,
        };
      }

      const logLine = `Frame ${nextFrameNumber}: ${frame.source}(${sourceHost.mac}) -> ${frame.destination}(${destinationHost.mac}) | ${result.message}`;
      setMacTable(nextTable);
      setFrameCount(nextFrameNumber);
      setLastResult(result);
      setEventLog((prevLog) => [logLine, ...prevLog].slice(0, 10));
    },
    [frameCount, macTable]
  );

  const runSelectedFrame = useCallback(() => {
    if (selectedSource === selectedDestination) return;
    processFrame({ source: selectedSource, destination: selectedDestination });
  }, [processFrame, selectedDestination, selectedSource]);

  const runDemoStep = useCallback(() => {
    const frame = DEMO_SEQUENCE[demoStepIndex % DEMO_SEQUENCE.length];
    processFrame(frame);
    setDemoStepIndex((prev) => (prev + 1) % DEMO_SEQUENCE.length);
    setSelectedSource(frame.source);
    setSelectedDestination(frame.destination);
  }, [demoStepIndex, processFrame]);

  const resetSimulation = useCallback(() => {
    setMacTable({});
    setFrameCount(0);
    setLastResult(null);
    setEventLog([]);
    setDemoStepIndex(0);
    setSelectedSource('H1');
    setSelectedDestination('H3');
  }, []);

  const macRows = useMemo(
    () => Object.values(macTable).sort((left, right) => left.port - right.port || left.mac.localeCompare(right.mac)),
    [macTable]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Learning Switch Simulator</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          See MAC learning, unknown-destination flooding, and single-port forwarding once a destination is learned.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-900/95 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Frame Controls</h3>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">Source</label>
          <select
            value={selectedSource}
            onChange={(event) => setSelectedSource(event.target.value as HostId)}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
          >
            {HOSTS.map((host) => (
              <option key={`src-${host.id}`} value={host.id}>
                {host.id} ({host.mac})
              </option>
            ))}
          </select>

          <ArrowRight className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />

          <label className="text-sm text-zinc-600 dark:text-zinc-400">Destination</label>
          <select
            value={selectedDestination}
            onChange={(event) => setSelectedDestination(event.target.value as HostId)}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
          >
            {HOSTS.map((host) => (
              <option key={`dst-${host.id}`} value={host.id}>
                {host.id} ({host.mac})
              </option>
            ))}
          </select>

          <Button onClick={runSelectedFrame} disabled={selectedSource === selectedDestination}>
            Send Frame
          </Button>
          <Button variant="outline" onClick={runDemoStep}>
            Run Demo Step
          </Button>
          <Button variant="outline" className="gap-2" onClick={resetSimulation}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Demo sequence: unknown flood, learning via reply, then known-destination forwarding.
        </p>
      </div>

      <SimulationCanvas isLive={Boolean(lastResult)}>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {HOSTS.map((host) => {
              const isIngress = lastResult?.ingressPort === host.port;
              const isEgress = lastResult?.outputPorts.includes(host.port);
              return (
                <div
                  key={host.id}
                  className={`rounded-lg border p-3 ${
                    isIngress
                      ? 'border-blue-500/60 bg-blue-500/10'
                      : isEgress && lastResult?.action === 'flood'
                        ? 'border-amber-500/60 bg-amber-500/10'
                        : isEgress
                          ? 'border-emerald-500/60 bg-emerald-500/10'
                          : 'border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-900/95'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-foreground">
                      {host.id} (Port {host.port})
                    </div>
                    {isIngress && <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40">Ingress</Badge>}
                    {!isIngress && isEgress && lastResult?.action === 'flood' && (
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40">Flooded</Badge>
                    )}
                    {!isIngress && isEgress && lastResult?.action === 'forward' && (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">Forwarded</Badge>
                    )}
                  </div>
                  <div className="mt-1 text-xs font-mono text-zinc-600 dark:text-zinc-400">{host.mac}</div>
                </div>
              );
            })}
          </div>

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-900/95 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Switch MAC Table</h3>
            {macRows.length === 0 ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">Table empty. Send frames to start learning source MAC addresses.</div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  <div>MAC Address</div>
                  <div>Port</div>
                  <div>Last Seen</div>
                </div>
                {macRows.map((entry) => (
                  <div key={entry.mac} className="grid grid-cols-3 gap-2 rounded px-1 py-1 text-xs">
                    <div className="font-mono text-foreground">{entry.mac}</div>
                    <div className="text-zinc-600 dark:text-zinc-400">{entry.port}</div>
                    <div className="text-zinc-600 dark:text-zinc-400">Frame {entry.lastSeenFrame}</div>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Current Decision</h3>
            {lastResult ? (
              <div className="space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                <p>
                  Learned: <span className="font-mono text-foreground">{lastResult.learnedSourceMac}</span> on port{' '}
                  <span className="text-foreground">{lastResult.learnedPort}</span>.
                </p>
                <p>
                  Action:{' '}
                  <span className="font-medium text-foreground">
                    {lastResult.action === 'flood'
                      ? 'Flood unknown destination'
                      : lastResult.action === 'forward'
                        ? 'Forward to one learned port'
                        : 'Filter (destination on ingress port)'}
                  </span>
                </p>
                <p>{lastResult.message}</p>
              </div>
            ) : (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">No frame processed yet.</div>
            )}
          </div>

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Event Log</h3>
            {eventLog.length === 0 ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">Log is empty.</div>
            ) : (
              eventLog.map((line) => (
                <div key={line} className="text-sm font-mono text-zinc-900 dark:text-zinc-200">
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      </SimulationCanvas>
    </div>
  );
};



