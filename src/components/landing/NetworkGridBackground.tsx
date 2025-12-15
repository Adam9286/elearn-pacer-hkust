import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Node {
  id: number;
  x: number;
  y: number;
  connections: number[];
}

const NetworkGridBackground = () => {
  const [activeNodes, setActiveNodes] = useState<number[]>([]);
  
  // Create grid of nodes
  const nodes: Node[] = [];
  const cols = 12;
  const rows = 8;
  
  for (let i = 0; i < cols * rows; i++) {
    const x = (i % cols) / (cols - 1) * 100;
    const y = Math.floor(i / cols) / (rows - 1) * 100;
    
    // Connect to nearby nodes
    const connections: number[] = [];
    if (i % cols < cols - 1) connections.push(i + 1); // right
    if (i < cols * (rows - 1)) connections.push(i + cols); // below
    if (i % cols < cols - 1 && i < cols * (rows - 1)) connections.push(i + cols + 1); // diagonal
    
    nodes.push({ id: i, x, y, connections });
  }

  // Randomly activate nodes for "ping" effect
  useEffect(() => {
    const interval = setInterval(() => {
      const randomNodes = Array.from({ length: 3 }, () => 
        Math.floor(Math.random() * nodes.length)
      );
      setActiveNodes(randomNodes);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Deep gradient base - force dark theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-dark-void via-dark-void/95 to-navy/30" />
      
      {/* Subtle noise texture */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Network grid with connections */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--electric-cyan))" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(var(--electric-cyan))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--electric-cyan))" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="nodeGlow">
            <stop offset="0%" stopColor="hsl(var(--electric-cyan))" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(var(--electric-cyan))" stopOpacity="0" />
          </radialGradient>
        </defs>
        
        {/* Connection lines */}
        {nodes.map((node) =>
          node.connections.map((targetId) => {
            const target = nodes[targetId];
            if (!target) return null;
            return (
              <motion.line
                key={`${node.id}-${targetId}`}
                x1={`${node.x}%`}
                y1={`${node.y}%`}
                x2={`${target.x}%`}
                y2={`${target.y}%`}
                stroke="hsl(var(--electric-cyan))"
                strokeWidth="0.5"
                strokeOpacity="0.1"
              />
            );
          })
        )}
        
        {/* Data packets traveling along connections */}
        {[0, 1, 2, 3, 4].map((i) => {
          const startNode = nodes[Math.floor(i * 15) % nodes.length];
          const endNode = startNode.connections[0] ? nodes[startNode.connections[0]] : startNode;
          return (
            <motion.circle
              key={`packet-${i}`}
              r="2"
              fill="hsl(var(--electric-cyan))"
              filter="url(#packetGlow)"
              animate={{
                cx: [`${startNode.x}%`, `${endNode.x}%`],
                cy: [`${startNode.y}%`, `${endNode.y}%`],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 1.5,
                ease: "linear",
              }}
            />
          );
        })}
        
        {/* Grid nodes */}
        {nodes.map((node) => (
          <g key={node.id}>
            {/* Node dot */}
            <circle
              cx={`${node.x}%`}
              cy={`${node.y}%`}
              r="2"
              fill="hsl(var(--electric-cyan))"
              opacity={0.3}
            />
            
            {/* Active ping effect */}
            {activeNodes.includes(node.id) && (
              <motion.circle
                cx={`${node.x}%`}
                cy={`${node.y}%`}
                fill="none"
                stroke="hsl(var(--electric-cyan))"
                initial={{ r: 2, opacity: 0.8 }}
                animate={{ r: 20, opacity: 0 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            )}
          </g>
        ))}
      </svg>
      
      {/* Signal waves at bottom */}
      <svg className="absolute bottom-0 left-0 w-full h-32 opacity-20">
        <defs>
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--electric-cyan))" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(var(--electric-cyan))" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Multiple sine waves */}
        {[0, 1, 2].map((i) => (
          <motion.path
            key={`wave-${i}`}
            d="M0,64 Q25,32 50,64 T100,64 T150,64 T200,64 T250,64 T300,64 T350,64 T400,64 T450,64 T500,64 T550,64 T600,64 T650,64 T700,64 T750,64 T800,64 T850,64 T900,64 T950,64 T1000,64"
            fill="none"
            stroke="url(#waveGradient)"
            strokeWidth={1.5 - i * 0.3}
            strokeOpacity={0.5 - i * 0.15}
            animate={{
              d: [
                "M0,64 Q25,32 50,64 T100,64 T150,64 T200,64 T250,64 T300,64 T350,64 T400,64 T450,64 T500,64 T550,64 T600,64 T650,64 T700,64 T750,64 T800,64 T850,64 T900,64 T950,64 T1000,64",
                "M0,64 Q25,96 50,64 T100,64 T150,64 T200,64 T250,64 T300,64 T350,64 T400,64 T450,64 T500,64 T550,64 T600,64 T650,64 T700,64 T750,64 T800,64 T850,64 T900,64 T950,64 T1000,64",
              ],
            }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
              delay: i * 0.5,
            }}
          />
        ))}
      </svg>
      
      {/* Radial gradient spotlight */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, hsl(var(--electric-cyan) / 0.08) 0%, transparent 50%)',
        }}
      />
      
      {/* Accent glow spots */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, hsl(var(--neon-purple) / 0.1), transparent 70%)' }}
        animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, hsl(var(--electric-cyan) / 0.1), transparent 70%)' }}
        animate={{ opacity: [0.5, 0.3, 0.5], scale: [1.1, 1, 1.1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
};

export default NetworkGridBackground;
