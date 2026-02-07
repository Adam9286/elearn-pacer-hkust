import { motion } from "framer-motion";

const DataStreamConnection = () => {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-24 pointer-events-none overflow-hidden opacity-50">
      {/* Stream Lines */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-electric-cyan to-transparent"
          style={{ top: `${40 + i * 10}%` }}
          animate={{
            x: ["-100%", "100%"],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2 + i,
            repeat: Infinity,
            ease: "linear",
            delay: i * 0.5,
          }}
        />
      ))}
      
      {/* Particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={`p-${i}`}
          className="absolute top-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_10px_white]"
          style={{ top: `${40 + (i % 3) * 10}%` }}
          animate={{
            left: ["0%", "100%"],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
};

export default DataStreamConnection;
