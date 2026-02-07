import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const PacketTraceBackground = () => {
  const [packets, setParticles] = useState<string[]>([]);

  useEffect(() => {
    // Generate some dummy packet data
    const protocols = ["TCP", "UDP", "HTTP", "TLSv1.3", "ARP", "ICMP"];
    const ips = () => `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    
    const generatePacket = () => {
      const time = new Date().toISOString().split('T')[1].slice(0, -1);
      const proto = protocols[Math.floor(Math.random() * protocols.length)];
      const src = ips();
      const dst = ips();
      const len = Math.floor(Math.random() * 1500);
      return `${time}  ${src.padEnd(15)} -> ${dst.padEnd(15)}  ${proto.padEnd(8)} Len=${len}`;
    };

    const initialPackets = Array.from({ length: 50 }, generatePacket);
    setParticles(initialPackets);

    const interval = setInterval(() => {
        setParticles(prev => [...prev.slice(1), generatePacket()]);
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-dark-void font-mono text-[10px] md:text-xs leading-tight text-electric-cyan/10 select-none pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-b from-dark-void via-transparent to-dark-void z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-dark-void via-transparent to-dark-void z-10" />
      
      <div className="p-4 opacity-30 blur-[1px]">
        {packets.map((packet, i) => (
          <div key={i} className="whitespace-pre">{packet}</div>
        ))}
      </div>
    </div>
  );
};

export default PacketTraceBackground;
