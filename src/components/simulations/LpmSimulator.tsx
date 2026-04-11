import { useMemo, useState } from 'react';
import { RotateCcw, Router } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SimulationCanvas } from './SimulationCanvas';
import { SimulationCoachPanel } from './SimulationCoachPanel';
import { SimulatorToolbar } from './SimulatorToolbar';
import {
  toolbarControlGroupClass,
  toolbarGhostButtonClass,
  toolbarInputClass,
  toolbarPrimaryButtonClass,
  toolbarToggleButtonClass,
} from './SimulatorToolbar.styles';
import type { SimulatorStepProps } from './simulatorStepConfig';
import type { SimulationLesson } from './simulationTeaching';

interface RouteEntry {
  id: string;
  prefix: string;
  nextHop: string;
  outInterface: string;
}

interface MatchResult {
  route: RouteEntry;
  isMatch: boolean;
  prefixLength: number;
  prefixBits: string;
}

const ROUTES: RouteEntry[] = [
  { id: 'r1', prefix: '0.0.0.0/0', nextHop: 'ISP-GW', outInterface: 'eth0' },
  { id: 'r2', prefix: '10.0.0.0/8', nextHop: 'CORE-A', outInterface: 'eth1' },
  { id: 'r3', prefix: '10.20.0.0/16', nextHop: 'DIST-B', outInterface: 'eth2' },
  { id: 'r4', prefix: '10.20.30.0/24', nextHop: 'ACCESS-C', outInterface: 'eth3' },
  { id: 'r5', prefix: '10.20.30.128/25', nextHop: 'LAB-VLAN', outInterface: 'eth4' },
  { id: 'r6', prefix: '172.16.0.0/12', nextHop: 'DMZ', outInterface: 'eth5' },
  { id: 'r7', prefix: '192.168.1.0/24', nextHop: 'CAMPUS-LAN', outInterface: 'eth6' },
];

const DEST_PRESETS = [
  { label: '10.20.30.150', ip: '10.20.30.150' },
  { label: '10.20.30.40', ip: '10.20.30.40' },
  { label: '10.20.99.7', ip: '10.20.99.7' },
  { label: '10.88.1.1', ip: '10.88.1.1' },
  { label: '172.18.8.9', ip: '172.18.8.9' },
  { label: '8.8.8.8', ip: '8.8.8.8' },
];

const LPM_LESSON: SimulationLesson = {
  intro: 'This simulator teaches how a router chooses one route when several prefixes match the same destination address.',
  focus: 'The key rule is simple: the most specific matching prefix wins.',
  steps: [
    {
      title: 'Destination Lookup',
      explanation: 'Start with the destination IP. The router must compare it against every prefix in the routing table.',
      whatToNotice: 'A valid destination address is required before any route comparison can happen.',
      whyItMatters: 'Forwarding begins with the destination bits, not with the route list order.',
    },
    {
      title: 'Binary Comparison',
      explanation: 'The router compares leading bits to see which prefixes match. Some routes match broadly, while others match more precisely.',
      whatToNotice: 'A /8 route matches more addresses than a /24 or /25 route, so several entries can match at once.',
      whyItMatters: 'Binary prefix comparison is what makes CIDR routing tables flexible and scalable.',
    },
    {
      title: 'Longest Prefix Wins',
      explanation: 'The router chooses the matching route with the largest prefix length because it describes the destination most exactly.',
      whatToNotice: 'The highlighted best match usually has the longest prefix among all matching entries.',
      whyItMatters: 'This lets one table hold both broad defaults and very specific local routes without conflict.',
    },
  ],
  glossary: [
    { term: 'Prefix', definition: 'The network part of a route, such as 10.20.30.0/24.' },
    { term: 'Next Hop', definition: 'The next router or gateway that should receive the packet.' },
    { term: 'Default Route', definition: 'A catch-all route used when nothing more specific matches.' },
    { term: 'Specific Match', definition: 'A route with more matching prefix bits than another route.' },
  ],
  takeaway: 'Longest prefix match is how routers make precise forwarding choices from overlapping route entries.',
  commonMistake: 'The default route does not win just because it matches everything. It wins only when no more specific route matches.',
  nextObservation: 'Try two destinations from the same 10.20.30.0/24 range and see why only one falls into the narrower /25 route.',
};

const isValidIpv4 = (ip: string) => {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false;
    const value = Number(part);
    return value >= 0 && value <= 255;
  });
};

const ipToBinary = (ip: string) =>
  ip
    .split('.')
    .map((octet) => Number(octet).toString(2).padStart(8, '0'))
    .join('');

const groupedBinary = (binary32: string) =>
  [0, 8, 16, 24].map((start) => binary32.slice(start, start + 8)).join(' ');

const parsePrefix = (prefix: string) => {
  const [networkIp, lengthRaw] = prefix.split('/');
  const length = Number(lengthRaw);
  const networkBits = ipToBinary(networkIp);
  return {
    networkIp,
    length,
    prefixBits: networkBits.slice(0, length),
  };
};

const highlightBits = (bits: string, length: number) => {
  const left = bits.slice(0, length);
  const right = bits.slice(length);
  return (
    <span className="font-mono text-xs break-all">
      <span className="bg-emerald-500/20 text-emerald-300 px-0.5 rounded">{left}</span>
      <span className="text-zinc-600 dark:text-zinc-400">{right}</span>
    </span>
  );
};

export const LpmSimulator = ({ onStepChange }: SimulatorStepProps) => {
  const [destinationIp, setDestinationIp] = useState('10.20.30.150');
  const [manualInput, setManualInput] = useState('10.20.30.150');

  const destinationValid = isValidIpv4(destinationIp);
  const destinationBinary = destinationValid ? ipToBinary(destinationIp) : '';

  const results = useMemo<MatchResult[]>(() => {
    if (!destinationValid) return [];
    return ROUTES.map((route) => {
      const parsed = parsePrefix(route.prefix);
      const isMatch = destinationBinary.startsWith(parsed.prefixBits);
      return {
        route,
        isMatch,
        prefixLength: parsed.length,
        prefixBits: parsed.prefixBits,
      };
    });
  }, [destinationBinary, destinationValid]);

  const bestMatch = useMemo(() => {
    const matches = results.filter((result) => result.isMatch);
    if (matches.length === 0) return null;
    return matches.reduce((best, current) =>
      current.prefixLength > best.prefixLength ? current : best
    );
  }, [results]);
  const coachStep = !destinationValid ? 0 : bestMatch ? 2 : 1;

  const applyManual = () => {
    if (isValidIpv4(manualInput)) setDestinationIp(manualInput.trim());
  };

  const reset = () => {
    setDestinationIp('10.20.30.150');
    setManualInput('10.20.30.150');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Longest Prefix Match (LPM) Simulator</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Compare destination bits against all matching prefixes and forward using the most specific match.
        </p>
      </div>

      <SimulatorToolbar
        label="Destination IP"
        hint={!isValidIpv4(manualInput) ? 'Manual input must be a valid IPv4 address.' : undefined}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className={toolbarControlGroupClass}>
          {DEST_PRESETS.map((preset) => (
            <Button
              key={preset.ip}
              size="sm"
              variant={destinationIp === preset.ip ? 'default' : 'outline'}
              onClick={() => {
                setDestinationIp(preset.ip);
                setManualInput(preset.ip);
              }}
              className={toolbarToggleButtonClass(destinationIp === preset.ip)}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <div className={toolbarControlGroupClass}>
          <input
            value={manualInput}
            onChange={(event) => setManualInput(event.target.value)}
            className={`${toolbarInputClass} w-[220px]`}
            placeholder="e.g. 10.20.30.150"
          />
          <Button onClick={applyManual} disabled={!isValidIpv4(manualInput)} className={toolbarPrimaryButtonClass}>
            Apply
          </Button>
          <Button variant="ghost" className={`gap-2 ${toolbarGhostButtonClass}`} onClick={reset}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
        </div>
      </SimulatorToolbar>

      <SimulationCanvas
        isLive={destinationValid}
        coachPanel={(
          <SimulationCoachPanel
            lesson={LPM_LESSON}
            currentStep={coachStep}
            isComplete={Boolean(bestMatch)}
          />
        )}
      >
        {destinationValid ? (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-900/95 p-4 mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">Destination Binary</h3>
            <div className="font-mono text-sm text-foreground">{destinationIp}</div>
            <div className="font-mono text-xs text-zinc-600 dark:text-zinc-400 mt-1">{groupedBinary(destinationBinary)}</div>
          </div>
        ) : (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 mb-4 text-sm text-red-300">
            Enter a valid IPv4 destination to run binary prefix comparison.
          </div>
        )}

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-900/95 p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Routing Table Binary Comparison</h3>
          <div className="space-y-2">
            {results.map((result) => {
              const parsed = parsePrefix(result.route.prefix);
              const selected =
                bestMatch &&
                result.route.prefix === bestMatch.route.prefix &&
                result.prefixLength === bestMatch.prefixLength;
              return (
                <div
                  key={result.route.id}
                  className={`rounded border p-2 ${
                    selected
                      ? 'border-emerald-500/60 bg-emerald-500/10'
                      : result.isMatch
                        ? 'border-blue-500/50 bg-blue-500/10'
                        : 'border-border/40 bg-zinc-100 dark:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium text-foreground">{result.route.prefix}</div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">
                      {result.isMatch ? `Match (/ ${result.prefixLength})` : 'No match'}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    Next-hop: {result.route.nextHop} | Interface: {result.route.outInterface}
                  </div>
                  <div className="mt-2">
                    {highlightBits(parsed.networkIp ? ipToBinary(parsed.networkIp) : '', result.prefixLength)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/50 p-4 mt-4">
          <h3 className="text-sm font-semibold text-foreground">Forwarding Decision</h3>
          {bestMatch ? (
            <div className="mt-2 text-sm text-zinc-900 dark:text-zinc-200">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <Router className="h-4 w-4" />
                Selected route: {bestMatch.route.prefix}
              </div>
              <p className="mt-1">
                Multiple matches can exist; LPM chooses the largest prefix length ({bestMatch.prefixLength}) for most specific forwarding.
              </p>
              <p className="mt-1">
                Forward out <span className="text-foreground">{bestMatch.route.outInterface}</span> to next-hop{' '}
                <span className="text-foreground">{bestMatch.route.nextHop}</span>.
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-900 dark:text-zinc-200">No matching route found.</p>
          )}
        </div>
      </SimulationCanvas>
    </div>
  );
};



