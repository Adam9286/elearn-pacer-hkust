import { useMemo, useState } from 'react';
import { Network, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SimulationCanvas } from './SimulationCanvas';
import { SimulationCoachPanel } from './SimulationCoachPanel';
import { SimulatorToolbar } from './SimulatorToolbar';
import {
  toolbarControlGroupClass,
  toolbarGhostButtonClass,
  toolbarInputClass,
  toolbarPrimaryButtonClass,
  toolbarSecondaryButtonClass,
  toolbarSelectClass,
  toolbarToggleButtonClass,
} from './SimulatorToolbar.styles';
import type { SimulatorStepProps } from './simulatorStepConfig';
import type { SimulationLesson } from './simulationTeaching';

type HostId = 'H1' | 'H2' | 'H3' | 'H4';

interface HostInfo {
  id: HostId;
  ip: string;
  mac: string;
}

interface ArpReplyFrame {
  sourceMac: string;
  destinationMac: string;
  sourceIp: string;
  destinationIp: string;
}

interface ArpTransaction {
  sender: HostId;
  targetIp: string;
  recipients: HostId[];
  responder: HostId | null;
  reply?: ArpReplyFrame;
  cacheUpdated: boolean;
  notes: string[];
}

type ArpCaches = Record<HostId, Record<string, string>>;

const BROADCAST_MAC = 'FF:FF:FF:FF:FF:FF';

const HOSTS: HostInfo[] = [
  { id: 'H1', ip: '10.0.0.11', mac: '00:11:22:33:44:11' },
  { id: 'H2', ip: '10.0.0.22', mac: '00:11:22:33:44:22' },
  { id: 'H3', ip: '10.0.0.33', mac: '00:11:22:33:44:33' },
  { id: 'H4', ip: '10.0.0.44', mac: '00:11:22:33:44:44' },
];

const ARP_BASE_LESSON: Omit<SimulationLesson, 'steps'> = {
  intro: 'This simulator teaches how a host discovers the MAC address that belongs to an IP address on the local network.',
  focus: 'Watch the broadcast request, the single correct reply, and the cache entry created at the sender.',
  glossary: [
    { term: 'ARP', definition: 'The protocol that maps an IP address to a MAC address on a local network.' },
    { term: 'Broadcast', definition: 'A frame sent to every device on the local LAN.' },
    { term: 'MAC Address', definition: 'The local-link hardware address used by Ethernet.' },
    { term: 'ARP Cache', definition: 'A short-term memory of recently learned IP-to-MAC mappings.' },
  ],
  takeaway: 'Before sending an Ethernet frame on the LAN, a host often needs ARP to learn the correct destination MAC address.',
  commonMistake: 'ARP works only on the local network segment. It does not discover MAC addresses across the whole internet.',
  nextObservation: 'Try a nonexistent IP and compare the silence with the normal successful reply case.',
};

const TARGET_PRESETS = [
  '10.0.0.22',
  '10.0.0.33',
  '10.0.0.44',
  '10.0.0.99',
];

const emptyCaches = (): ArpCaches => ({
  H1: {},
  H2: {},
  H3: {},
  H4: {},
});

const hostById = (id: HostId) => HOSTS.find((host) => host.id === id)!;
const hostByIp = (ip: string) => HOSTS.find((host) => host.ip === ip) ?? null;

const isValidIpv4 = (ip: string) => {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false;
    const value = Number(part);
    return value >= 0 && value <= 255;
  });
};

export const ArpSimulator = ({ onStepChange }: SimulatorStepProps) => {
  const [sender, setSender] = useState<HostId>('H1');
  const [targetIp, setTargetIp] = useState('10.0.0.33');
  const [manualIp, setManualIp] = useState('10.0.0.33');
  const [caches, setCaches] = useState<ArpCaches>(emptyCaches);
  const [lastTransaction, setLastTransaction] = useState<ArpTransaction | null>(null);
  const [eventLog, setEventLog] = useState<string[]>([]);

  const senderHost = hostById(sender);
  const senderCache = caches[sender];
  const cacheRows = useMemo(
    () => Object.entries(senderCache).sort((left, right) => left[0].localeCompare(right[0])),
    [senderCache]
  );
  const coachStep = !lastTransaction ? 0 : lastTransaction.reply ? 2 : 1;
  const coachLesson: SimulationLesson = {
    ...ARP_BASE_LESSON,
    focus: lastTransaction
      ? `The sender is ${sender}. Watch how the request for ${targetIp} affects the reply and cache result.`
      : ARP_BASE_LESSON.focus,
    steps: [
      {
        title: 'Broadcast Request',
        explanation: 'The sender asks every host on the local LAN: "Who has this IP address?" because it does not yet know the correct MAC address.',
        whatToNotice: `The request uses destination MAC ${BROADCAST_MAC}, which reaches every host on the LAN.`,
        whyItMatters: 'A host cannot build the final Ethernet frame until it knows the destination MAC address for the local hop.',
      },
      {
        title: 'Check for the Owner',
        explanation: lastTransaction?.reply
          ? `${lastTransaction.responder} is the only host that owns ${targetIp}, so only that host should answer.`
          : `No host owns ${targetIp}, so nobody can send a valid ARP reply.`,
        whatToNotice: lastTransaction?.reply
          ? 'All hosts hear the broadcast, but only the correct owner sends the reply.'
          : 'The request was heard, but no reply appears because the target IP is not present on this LAN.',
        whyItMatters: 'ARP is a local discovery protocol. Correct ownership matters because only one device should claim the IP.',
      },
      {
        title: 'Update the Cache',
        explanation: lastTransaction?.cacheUpdated
          ? `${sender} stores ${targetIp} in its ARP cache so later frames can be sent faster.`
          : 'Without a reply, the sender cannot cache a mapping and must still treat the address as unresolved.',
        whatToNotice: lastTransaction?.cacheUpdated
          ? 'The cache row appears immediately after a successful reply.'
          : 'The cache remains empty when no reply is returned.',
        whyItMatters: ARP_BASE_LESSON.takeaway,
      },
    ],
  };

  const runArpBroadcast = () => {
    if (!isValidIpv4(targetIp)) return;
    const recipients = HOSTS.filter((host) => host.id !== sender).map((host) => host.id);
    const owner = hostByIp(targetIp);
    const responder = owner && owner.id !== sender ? owner.id : null;

    const notes: string[] = [];
    notes.push(`${sender} broadcasts: "Who has IP ${targetIp}? Tell ${senderHost.ip}" using destination MAC ${BROADCAST_MAC}.`);

    let reply: ArpReplyFrame | undefined;
    let cacheUpdated = false;

    if (responder) {
      const responderHost = hostById(responder);
      reply = {
        sourceMac: responderHost.mac,
        destinationMac: senderHost.mac,
        sourceIp: responderHost.ip,
        destinationIp: senderHost.ip,
      };

      setCaches((prev) => ({
        ...prev,
        [sender]: {
          ...prev[sender],
          [targetIp]: responderHost.mac,
        },
      }));
      cacheUpdated = true;
      notes.push(`${responder} is the owner of ${targetIp}, so only ${responder} sends an ARP Reply.`);
      notes.push(`${sender} stores ${targetIp} -> ${responderHost.mac} in its ARP cache.`);
    } else {
      notes.push(`No host owns ${targetIp}, so no ARP Reply is returned.`);
    }

    setLastTransaction({
      sender,
      targetIp,
      recipients,
      responder,
      reply,
      cacheUpdated,
      notes,
    });

    const summary = responder
      ? `${sender} ARP resolved ${targetIp} to ${hostById(responder).mac}.`
      : `${sender} ARP request for ${targetIp} got no reply.`;
    setEventLog((prev) => [summary, ...prev].slice(0, 12));
  };

  const resetSimulation = () => {
    setSender('H1');
    setTargetIp('10.0.0.33');
    setManualIp('10.0.0.33');
    setCaches(emptyCaches());
    setLastTransaction(null);
    setEventLog([]);
  };

  return (
    <div className="space-y-4">

      <SimulatorToolbar label="Request Setup">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className={toolbarControlGroupClass}>
          <label className="text-sm text-zinc-600 dark:text-zinc-400">Sender</label>
          <select
            value={sender}
            onChange={(event) => setSender(event.target.value as HostId)}
            className={toolbarSelectClass}
          >
            {HOSTS.map((host) => (
              <option key={host.id} value={host.id}>
                {host.id} ({host.ip})
              </option>
            ))}
          </select>
        </div>

        <div className={toolbarControlGroupClass}>
          {TARGET_PRESETS.map((preset) => (
            <Button
              key={preset}
              size="sm"
              variant={targetIp === preset ? 'default' : 'outline'}
              onClick={() => {
                setTargetIp(preset);
                setManualIp(preset);
              }}
              className={toolbarToggleButtonClass(targetIp === preset)}
            >
              {preset}
            </Button>
          ))}
        </div>

        <div className={toolbarControlGroupClass}>
          <input
            value={manualIp}
            onChange={(event) => setManualIp(event.target.value)}
            className={`${toolbarInputClass} w-[220px]`}
            placeholder="e.g. 10.0.0.33"
          />
          <Button
            onClick={() => {
              if (isValidIpv4(manualIp)) setTargetIp(manualIp.trim());
            }}
            disabled={!isValidIpv4(manualIp)}
            className={toolbarSecondaryButtonClass}
          >
            Apply IP
          </Button>
          <Button onClick={runArpBroadcast} disabled={!isValidIpv4(targetIp)} className={`gap-2 ${toolbarPrimaryButtonClass}`}>
            <Network className="h-4 w-4" />
            Broadcast ARP Request
          </Button>
          <Button variant="ghost" className={`gap-2 ${toolbarGhostButtonClass}`} onClick={resetSimulation}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
        </div>
      </SimulatorToolbar>

      <SimulationCanvas
        isLive={Boolean(lastTransaction)}
        coachPanel={(
          <SimulationCoachPanel
            lesson={coachLesson}
            currentStep={coachStep}
            isComplete={Boolean(lastTransaction?.cacheUpdated)}
          />
        )}
      >
        <div className="grid gap-3 md:grid-cols-2">
          {HOSTS.map((host) => {
            const isSender = host.id === sender;
            const gotBroadcast = lastTransaction?.recipients.includes(host.id) ?? false;
            const replied = lastTransaction?.responder === host.id;
            return (
              <div
                key={host.id}
                className={`rounded-xl p-3 ${
                  replied
                    ? 'bg-emerald-500/10 ring-1 ring-emerald-500/40'
                    : isSender
                      ? 'bg-blue-500/10 ring-1 ring-blue-500/40'
                      : gotBroadcast
                        ? 'bg-amber-500/10 ring-1 ring-amber-500/40'
                        : 'bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-foreground">{host.id}</div>
                  {isSender && <Badge className="bg-blue-500/20 text-blue-300">Sender</Badge>}
                  {!isSender && gotBroadcast && !replied && (
                    <Badge className="bg-amber-500/20 text-amber-300">Received Broadcast</Badge>
                  )}
                  {replied && <Badge className="bg-emerald-500/20 text-emerald-300">Sent Reply</Badge>}
                </div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">IP: {host.ip}</div>
                <div className="text-xs font-mono text-zinc-600 dark:text-zinc-400">MAC: {host.mac}</div>
              </div>
            );
          })}
        </div>

        <section className="space-y-2 py-2">
          <h3 className="text-sm font-semibold tracking-wide text-foreground">ARP Frames</h3>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            <span className="text-foreground font-medium">Request:</span> src MAC {senderHost.mac}, dst MAC{' '}
            <span className="font-mono text-foreground">{BROADCAST_MAC}</span>, sender IP {senderHost.ip}, target IP {targetIp}.
          </div>
          {lastTransaction?.reply ? (
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              <span className="text-foreground font-medium">Reply:</span> src MAC {lastTransaction.reply.sourceMac}, dst MAC{' '}
              {lastTransaction.reply.destinationMac}, "{lastTransaction.reply.sourceIp} is at {lastTransaction.reply.sourceMac}".
            </div>
          ) : (
            <div className="text-xs text-zinc-600 dark:text-zinc-400">Reply: none.</div>
          )}
        </section>

        <section className="space-y-2 py-2">
          <h3 className="text-sm font-semibold tracking-wide text-foreground">Sender ARP Cache ({sender})</h3>
          {cacheRows.length === 0 ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Cache empty.</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                <div>IP</div>
                <div>MAC</div>
              </div>
              {cacheRows.map(([ip, mac]) => {
                const updated = lastTransaction?.cacheUpdated && lastTransaction.targetIp === ip;
                return (
                  <div
                    key={`${sender}-${ip}`}
                    className={`grid grid-cols-2 gap-2 rounded px-1 py-1 text-xs ${
                      updated ? 'bg-emerald-500/10 ring-1 ring-emerald-500/30' : ''
                    }`}
                  >
                    <div className="text-foreground">{ip}</div>
                    <div className="font-mono text-zinc-600 dark:text-zinc-400">{mac}</div>
                  </div>
                );
              })}
            </>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card/80 p-4 font-mono shadow-sm">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Transaction Notes</h3>
          {lastTransaction ? (
            lastTransaction.notes.map((line) => (
              <div key={line} className="text-sm text-foreground">
                {line}
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">No ARP transaction yet.</div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card/80 p-4 font-mono shadow-sm">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Event Log</h3>
          {eventLog.length === 0 ? (
            <div className="text-sm text-muted-foreground">Log is empty.</div>
          ) : (
            eventLog.map((line) => (
              <div key={line} className="text-sm text-foreground">
                {line}
              </div>
            ))
          )}
        </section>
      </SimulationCanvas>
    </div>
  );
};



