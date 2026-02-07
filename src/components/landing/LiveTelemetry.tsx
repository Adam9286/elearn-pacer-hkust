import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const events = [
  "ESTABLISHING_CONNECTION...",
  "SYN_SENT_SEQ=100",
  "SYN_ACK_RECEIVED",
  "HANDSHAKE_COMPLETE",
  "DATA_STREAM_ACTIVE",
  "ANALYZING_PACKETS...",
  "ENCRYPTION_NEGOTIATED",
  "LATENCY_CHECK: 12ms",
];

const LiveTelemetry = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % events.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-1 font-mono text-[10px] text-electric-cyan/60 h-16 justify-center">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <span>LIVE_TELEMETRY</span>
      </div>
      <div className="h-8 overflow-hidden relative">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-0 left-0 whitespace-nowrap"
          >
            {">"} {events[index]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LiveTelemetry;
