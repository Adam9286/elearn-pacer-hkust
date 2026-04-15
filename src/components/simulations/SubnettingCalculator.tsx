import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { SimulationCanvas } from './SimulationCanvas';
import { SimulationCoachPanel } from './SimulationCoachPanel';
import { SimulatorToolbar } from './SimulatorToolbar';
import {
  toolbarControlGroupClass,
  toolbarInputClass,
  toolbarSecondaryButtonClass,
  toolbarSelectClass,
  toolbarToggleButtonClass,
} from './SimulatorToolbar.styles';
import type { SimulatorStepProps } from './simulatorStepConfig';
import type { SimulationLesson } from './simulationTeaching';

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Preset {
  id: string;
  title: string;
  ip: string;
  cidr: number;
  hint: string;
}

interface SubnetResult {
  networkAddress: string;
  broadcastAddress: string;
  firstUsable: string;
  lastUsable: string;
  totalHosts: number;
  usableHosts: number;
  subnetMask: string;
}
type ContentTab = 'simulation' | 'theory';

// â”€â”€ Presets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PRESETS: Preset[] = [
  {
    id: 'home',
    title: 'Home Network',
    ip: '192.168.1.0',
    cidr: 24,
    hint: 'A typical home network. 254 usable hosts -- more than enough for your devices.',
  },
  {
    id: 'office',
    title: 'Small Office',
    ip: '10.0.1.0',
    cidr: 28,
    hint: 'Only 14 usable hosts. Notice how a bigger prefix = smaller network.',
  },
  {
    id: 'campus',
    title: 'University Campus',
    ip: '172.16.0.0',
    cidr: 16,
    hint: '65,534 hosts! Large organizations use big subnets like this.',
  },
  {
    id: 'p2p',
    title: 'Point-to-Point Link',
    ip: '192.168.100.0',
    cidr: 30,
    hint: 'Just 2 usable hosts -- perfect for connecting two routers directly.',
  },
];

const SUBNETTING_LESSON: Omit<SimulationLesson, 'steps'> = {
  intro: 'This simulator teaches how one IP prefix divides addresses into the network part and the host part.',
  focus: 'Watch how changing the prefix length changes network size, usable hosts, and the binary split.',
  glossary: [
    { term: 'CIDR Prefix', definition: 'The /number that tells how many leading bits belong to the network.' },
    { term: 'Subnet Mask', definition: 'A dotted-decimal version of the network-versus-host split.' },
    { term: 'Network Address', definition: 'The first address in the subnet, identifying the subnet itself.' },
    { term: 'Broadcast Address', definition: 'The last address in the subnet, used to reach all hosts on that subnet.' },
  ],
  takeaway: 'A larger prefix means more network bits, fewer host bits, and therefore a smaller subnet.',
  commonMistake: 'Students often think /30 is bigger than /24 because 30 is a larger number. It is actually smaller because more bits are reserved for the network.',
  nextObservation: 'Toggle the binary view and watch where the network bits stop and the host bits start.',
};

// â”€â”€ Pure helper functions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function numberToIp(num: number): string {
  return [
    (num >>> 24) & 0xff,
    (num >>> 16) & 0xff,
    (num >>> 8) & 0xff,
    num & 0xff,
  ].join('.');
}

function cidrToMask(prefix: number): number {
  return prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
}

function cidrToMaskString(prefix: number): string {
  return numberToIp(cidrToMask(prefix));
}

function isValidIp(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every(p => {
    const n = Number(p);
    return /^\d{1,3}$/.test(p) && n >= 0 && n <= 255;
  });
}

function maskToCidr(mask: string): number | null {
  if (!isValidIp(mask)) return null;
  const num = ipToNumber(mask);
  // Check that it's a valid mask (contiguous 1s then 0s)
  const inverted = (~num) >>> 0;
  if (((inverted + 1) & inverted) !== 0) return null;
  let bits = 0;
  const v = num;
  for (let i = 0; i < 32; i++) {
    if ((v & (1 << (31 - i))) !== 0) bits++;
    else break;
  }
  return bits;
}

function calculateSubnet(ip: string, prefix: number): SubnetResult {
  const ipNum = ipToNumber(ip);
  const mask = cidrToMask(prefix);
  const network = (ipNum & mask) >>> 0;
  const broadcast = (network | ~mask) >>> 0;
  const totalHosts = Math.pow(2, 32 - prefix);
  const usableHosts = totalHosts - 2;

  return {
    networkAddress: numberToIp(network),
    broadcastAddress: numberToIp(broadcast),
    firstUsable: numberToIp(network + 1),
    lastUsable: numberToIp(broadcast - 1),
    totalHosts,
    usableHosts: Math.max(usableHosts, 0),
    subnetMask: numberToIp(mask),
  };
}

function toBinaryString(ip: string): string {
  return ip
    .split('.')
    .map(octet => Number(octet).toString(2).padStart(8, '0'))
    .join('.');
}

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const SubnettingCalculator = ({ onStepChange }: SimulatorStepProps) => {
  const [ipInput, setIpInput] = useState('192.168.1.0');
  const [cidr, setCidr] = useState(24);
  const [activePreset, setActivePreset] = useState<string>('home');
  const [activeHint, setActiveHint] = useState<string>(PRESETS[0].hint);
  const [activeTab] = useState<ContentTab>('simulation');
  const [showBinary, setShowBinary] = useState(false);
  const [manualMask, setManualMask] = useState('');

  const ipValid = isValidIp(ipInput);

  const result = useMemo(() => {
    if (!ipValid) return null;
    return calculateSubnet(ipInput, cidr);
  }, [ipInput, cidr, ipValid]);

  const binaryIp = useMemo(() => {
    if (!ipValid) return '';
    return toBinaryString(ipInput);
  }, [ipInput, ipValid]);

  const applyPreset = (preset: Preset) => {
    setIpInput(preset.ip);
    setCidr(preset.cidr);
    setActivePreset(preset.id);
    setActiveHint(preset.hint);
  };

  const clearPreset = () => {
    setActivePreset('');
    setActiveHint('');
  };

  const handleManualMaskApply = () => {
    const bits = maskToCidr(manualMask);
    if (bits !== null) {
      setCidr(bits);
      clearPreset();
    }
  };

  // Binary breakdown helpers
  const totalBits = binaryIp.replace(/\./g, '');
  const networkBits = totalBits.slice(0, cidr);
  const hostBits = totalBits.slice(cidr);

  // Format binary with dots every 8 bits for readability
  const formatBinarySegment = (bits: string, startIndex: number) => {
    const result: string[] = [];
    for (let i = 0; i < bits.length; i++) {
      const globalIndex = startIndex + i;
      if (globalIndex > 0 && globalIndex % 8 === 0) {
        result.push('.');
      }
      result.push(bits[i]);
    }
    return result.join('');
  };

  const networkBitsFormatted = formatBinarySegment(networkBits, 0);
  const hostBitsFormatted = formatBinarySegment(hostBits, cidr);
  const coachStep = !result ? 0 : showBinary ? 2 : 1;
  const coachLesson: SimulationLesson = {
    ...SUBNETTING_LESSON,
    focus: activeHint || SUBNETTING_LESSON.focus,
    steps: [
      {
        title: 'Enter the Prefix',
        explanation: 'Start with an IP address and a prefix length. Together they define the subnet you want to study.',
        whatToNotice: `Right now the calculator is using ${ipInput}/${cidr}.`,
        whyItMatters: 'The prefix length is what decides how many addresses belong to this subnet.',
      },
      {
        title: 'Read the Address Range',
        explanation: result
          ? `This subnet starts at ${result.networkAddress}, ends at ${result.broadcastAddress}, and offers ${result.usableHosts} usable host addresses.`
          : 'Once the input is valid, the calculator can show the subnet range and host capacity.',
        whatToNotice: 'The first and last addresses are reserved for the network and broadcast roles in normal IPv4 subnetting.',
        whyItMatters: 'Subnet planning depends on knowing how many usable addresses a prefix actually provides.',
      },
      {
        title: 'See the Binary Split',
        explanation: 'The binary view shows exactly where the network bits stop and the host bits begin.',
        whatToNotice: 'Everything before the slash belongs to the subnet identity. Everything after it can vary per host.',
        whyItMatters: SUBNETTING_LESSON.takeaway,
      },
    ],
  };

  return (
    <div className="space-y-4">

      {activeTab === 'simulation' ? (
        <div className="space-y-3">
          <SimulatorToolbar
            label="Subnet Controls"
            status={
              <Badge variant="outline" className="border-border bg-background/80 text-xs text-foreground">/{cidr}</Badge>
            }
          >
            <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className={toolbarControlGroupClass}>
              <label htmlFor="subnet-preset" className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Scenario</label>
              <select
                id="subnet-preset"
                value={activePreset || 'custom'}
                onChange={(e) => {
                  const preset = PRESETS.find((item) => item.id === e.target.value);
                  if (preset) {
                    applyPreset(preset);
                  } else {
                    clearPreset();
                  }
                }}
                className={`${toolbarSelectClass} min-w-[180px]`}
              >
                <option value="custom">Custom</option>
                {PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.title}
                  </option>
                ))}
              </select>

              <label htmlFor="subnet-ip" className="ml-2 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">IP</label>
              <input
                id="subnet-ip"
                type="text"
                value={ipInput}
                onChange={e => {
                  setIpInput(e.target.value);
                  clearPreset();
                }}
                placeholder="192.168.1.0"
                className={`${toolbarInputClass} w-48 font-mono ${
                  ipInput && !ipValid ? 'border-red-500 focus:border-red-500 focus:ring-red-500/40' : ''
                }`}
              />

              <div className="ml-auto flex items-center gap-2">
                <Button size="sm" variant={!showBinary ? 'default' : 'outline'} onClick={() => setShowBinary(false)} className={toolbarToggleButtonClass(!showBinary)}>Decimal</Button>
                <Button size="sm" variant={showBinary ? 'default' : 'outline'} onClick={() => setShowBinary(true)} className={toolbarToggleButtonClass(showBinary)}>Binary</Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium text-foreground min-w-[120px]">
                Prefix /{cidr}
              </label>
              <Slider
                value={[cidr]}
                onValueChange={([v]) => {
                  setCidr(v);
                  clearPreset();
                }}
                min={8}
                max={30}
                step={1}
                className="py-2 flex-1 min-w-[220px]"
              />
              <span className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">Mask: {cidrToMaskString(cidr)}</span>
            </div>

            <div className={toolbarControlGroupClass}>
              <label htmlFor="manual-mask" className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Mask Input</label>
              <input
                id="manual-mask"
                type="text"
                value={manualMask}
                onChange={e => setManualMask(e.target.value)}
                placeholder="255.255.255.0"
                className={`${toolbarInputClass} w-44 font-mono`}
              />
              <Button size="sm" variant="outline" onClick={handleManualMaskApply} disabled={maskToCidr(manualMask) === null} className={toolbarSecondaryButtonClass}>Apply</Button>
              {manualMask && maskToCidr(manualMask) !== null && (
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Equivalent: <span className="text-primary font-medium">/{maskToCidr(manualMask)}</span></span>
              )}
            </div>

            {ipInput && !ipValid && (
              <p className="text-xs text-red-400">
                Invalid IP address. Use format: 0-255.0-255.0-255.0-255
              </p>
            )}
            {manualMask && maskToCidr(manualMask) === null && (
              <p className="text-xs text-red-400">
                Invalid subnet mask. Must be contiguous 1s followed by 0s.
              </p>
            )}
            </div>
          </SimulatorToolbar>

          <SimulationCanvas
            isLive={ipValid && Boolean(result)}
            coachPanel={(
              <SimulationCoachPanel
                lesson={coachLesson}
                currentStep={coachStep}
                isComplete={Boolean(result)}
              />
            )}
          >
            <div className="space-y-4">
              {result && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Results</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: 'Network Address', value: showBinary ? toBinaryString(result.networkAddress) : result.networkAddress },
                      { label: 'Broadcast Address', value: showBinary ? toBinaryString(result.broadcastAddress) : result.broadcastAddress },
                      { label: 'First Usable Host', value: showBinary ? toBinaryString(result.firstUsable) : result.firstUsable },
                      { label: 'Last Usable Host', value: showBinary ? toBinaryString(result.lastUsable) : result.lastUsable },
                      { label: 'Total Hosts', value: result.totalHosts.toLocaleString() },
                      { label: 'Usable Hosts', value: result.usableHosts.toLocaleString() },
                      { label: 'Subnet Mask', value: showBinary ? toBinaryString(result.subnetMask) : result.subnetMask },
                    ].map(item => (
                      <div key={item.label} className="rounded-xl bg-white/[0.03] p-4 space-y-1">
                        <div className="text-xs text-zinc-600 dark:text-zinc-400">{item.label}</div>
                        <div className={`font-semibold text-foreground ${showBinary ? 'text-xs font-mono break-all' : 'text-sm font-mono'}`}>
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {ipValid && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Binary Breakdown</label>
                  <div className="overflow-x-auto rounded-xl border border-border bg-muted/50 p-4">
                    <div className="flex items-center gap-0 font-mono text-sm whitespace-nowrap">
                      <span className="text-primary font-semibold">{networkBitsFormatted}</span>
                      <span className="mx-1 text-zinc-600 dark:text-zinc-400 font-bold select-none">|</span>
                      <span className="text-emerald-400 font-semibold">{hostBitsFormatted}</span>
                    </div>
                    <div className="flex gap-3 mt-3">
                      <Badge variant="outline" className="bg-primary/10 text-primary">
                        Network: {cidr} bits
                      </Badge>
                      <Badge variant="outline" className="bg-emerald-400/10 text-emerald-400">
                        Host: {32 - cidr} bits
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SimulationCanvas>
        </div>
      ) : (
        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground text-sm">What Is This?</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Subnetting divides an IPv4 block into network bits and host bits. CIDR controls that split, which changes
              the network range, broadcast address, and usable host count.
            </p>
          </div>

          {activeHint && (
            <div className="pl-3">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                <span className="font-semibold text-foreground">Current scenario focus:</span> {activeHint}
              </p>
            </div>
          )}

          <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <p><span className="font-medium text-foreground">CIDR:</span> /24 means 24 network bits and 8 host bits.</p>
            <p><span className="font-medium text-foreground">Network Address:</span> all host bits set to 0.</p>
            <p><span className="font-medium text-foreground">Broadcast Address:</span> all host bits set to 1.</p>
            <p><span className="font-medium text-foreground">Usable hosts:</span> generally total addresses minus network and broadcast.</p>
          </div>

          <div className="pl-3">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              <strong className="text-foreground">Try this:</strong> change /24 to /25 and observe usable hosts roughly halve.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};



