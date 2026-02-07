import { motion } from "framer-motion";
import { Zap, Shield, Cloud, Search, Info, ArrowDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MagneticButton from "./MagneticButton";
import TCPHandshake from "./TCPHandshake";

const Hero = () => {
  const navigate = useNavigate();

  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: "smooth",
    });
  };

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden bg-[#05070A]">
      {/* Background Grid - subtle texture */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100px_100px] pointer-events-none opacity-[0.15]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,243,255,0.03),transparent_70%)] pointer-events-none" />
      {/* Top Bar - Fixed Height Header */}
      <div className="relative z-30 h-20 w-full border-b border-[rgba(0,255,255,0.2)] bg-black/30 backdrop-blur-md flex items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(var(--hkust-gold))] to-amber-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-black fill-black" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">LearningPacer</span>
        </div>

        {/* HUD Indicators - cyan glow */}
        <div className="flex items-center gap-6 font-mono text-sm tracking-widest">
          <div className="hidden md:flex items-center gap-2 text-electric-cyan drop-shadow-[0_0_15px_rgba(0,243,255,0.4)]">
            <span className="w-1.5 h-1.5 rounded-full bg-electric-cyan animate-pulse shadow-[0_0_6px_hsl(var(--electric-cyan))]" />
            STATUS: ONLINE
          </div>
          <span className="hidden lg:inline text-white/20">//</span>
          <div className="hidden lg:block text-electric-cyan/90 drop-shadow-[0_0_15px_rgba(0,243,255,0.4)]">TARGET: ELEC3120</div>
          <span className="hidden lg:inline text-white/20">//</span>
          <div className="hidden lg:block text-white/25">VERSION: 2.0</div>
        </div>
      </div>

      {/* Main Content Area - Centered Grid */}
      <div className="flex-1 relative z-20 flex items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-[1600px] grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Typography & CTAs (Span 5) */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            {/* Protocol Badge - cyan glow */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center px-4 py-2 rounded border border-electric-cyan/40 bg-electric-cyan/5 text-electric-cyan text-xs font-mono tracking-widest uppercase w-fit drop-shadow-[0_0_15px_rgba(0,243,255,0.4)]"
            >
              Protocol Layer 04: Transport
            </motion.div>

            {/* Headline - single line, no ghost */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black leading-none tracking-tighter text-white mb-3 drop-shadow-2xl">
                LearningPacer
              </h1>
              <p className="text-lg md:text-xl text-white/80 font-medium tracking-wide">
                A Virtual Teaching Assistant for ELEC3120
              </p>
            </motion.div>

            {/* Subtext */}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-base text-white/70 max-w-md leading-relaxed"
            >
              Deep dive into university-level network architectures with LearningPacer's Command Center. Establish a persistent connection to knowledge.
            </motion.p>

            {/* Data Stream Line - Decorative SVG connecting CTA to Video */}
            <div className="absolute top-[60%] left-[25%] w-[40%] h-[100px] pointer-events-none z-0 hidden lg:block">
              <svg width="100%" height="100%" viewBox="0 0 400 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 50 C 100 50, 150 50, 200 50 C 250 50, 300 50, 400 50" stroke="url(#stream-gradient)" strokeWidth="1" strokeOpacity="0.3" />
                <defs>
                  <linearGradient id="stream-gradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="transparent" />
                    <stop offset="50%" stopColor="#00F3FF" />
                    <stop offset="100%" stopColor="transparent" />
                  </linearGradient>
                </defs>
              </svg>
              <motion.div
                className="absolute top-[48px] left-0 w-1.5 h-1.5 bg-electric-cyan rounded-full shadow-[0_0_10px_#00F3FF]"
                animate={{
                  offsetDistance: ["0%", "100%"],
                  opacity: [0, 1, 0]
                }}
                style={{
                  offsetPath: "path('M0 50 C 100 50, 150 50, 200 50 C 250 50, 300 50, 400 50')",
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            </div>

            {/* CTAs */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <MagneticButton
                onClick={() => navigate("/platform")}
                className="group relative rounded overflow-hidden"
                strength={0.2}
              >
                <div className="bg-[hsl(var(--hkust-gold))] px-8 py-4 flex items-center gap-3 text-black font-bold text-sm tracking-wider hover:bg-amber-400 transition-colors shadow-[0_0_20px_rgba(255,191,0,0.4)]">
                  START LEARNING
                  <Zap className="w-4 h-4 fill-black" />
                </div>
              </MagneticButton>

              <button 
                onClick={scrollToContent}
                className="px-8 py-4 border border-white/15 text-white/50 font-bold text-sm tracking-wider rounded hover:bg-white/5 hover:text-white hover:border-white/25 transition-colors flex items-center gap-2"
              >
                INITIALIZE SYSTEM
                <ArrowDown className="w-4 h-4" />
              </button>
            </motion.div>

            {/* Stats Row */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex gap-4 pt-4"
            >
              {[
                { val: "15k+", label: "NODES", color: "text-electric-cyan", glow: "drop-shadow-[0_0_8px_hsl(var(--electric-cyan)/0.6)]" },
                { val: "99.9%", label: "UPTIME", color: "text-neon-purple", glow: "drop-shadow-[0_0_8px_hsl(var(--neon-purple)/0.5)]" },
                { val: "24/7", label: "SUPPORT", color: "text-[hsl(var(--hkust-gold))]", glow: "drop-shadow-[0_0_8px_hsl(var(--hkust-gold)/0.5)]" }
              ].map((stat, i) => (
                <div key={i} className="px-6 py-3 rounded border border-white/10 bg-black/40 backdrop-blur-sm min-w-[100px]">
                  <div className={`text-xl font-bold ${stat.color} ${stat.glow}`}>{stat.val}</div>
                  <div className="text-[10px] text-white/30 tracking-widest mt-1">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right Column: The "Window" (Span 7) */}
          <div className="lg:col-span-7 relative flex justify-center lg:justify-end">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "circOut" }}
              className="relative w-full aspect-video max-w-[1000px] p-1"
            >
              {/* Corner Brackets - subtle glow */}
              <div className="absolute -top-[1px] -left-[1px] w-4 h-4 border-t-2 border-l-2 border-electric-cyan/60 shadow-[0_0_8px_hsl(var(--electric-cyan)/0.4)]" />
              <div className="absolute -top-[1px] -right-[1px] w-4 h-4 border-t-2 border-r-2 border-electric-cyan/60 shadow-[0_0_8px_hsl(var(--electric-cyan)/0.4)]" />
              <div className="absolute -bottom-[1px] -left-[1px] w-4 h-4 border-b-2 border-l-2 border-electric-cyan/60 shadow-[0_0_8px_hsl(var(--electric-cyan)/0.4)]" />
              <div className="absolute -bottom-[1px] -right-[1px] w-4 h-4 border-b-2 border-r-2 border-electric-cyan/60 shadow-[0_0_8px_hsl(var(--electric-cyan)/0.4)]" />

              {/* Window Header */}
              <div className="absolute top-4 left-6 flex gap-2 z-20">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
              <div className="absolute top-4 right-6 font-mono text-[10px] text-electric-cyan tracking-widest z-20 drop-shadow-[0_0_6px_hsl(var(--electric-cyan)/0.7)]">
                VISUALIZING: TCP_THREE_WAY_HANDSHAKE
              </div>

              {/* Main Visual Content - radial mask, no hard border */}
              <div 
                className="w-full h-full relative overflow-hidden rounded-sm"
                style={{
                  maskImage: "radial-gradient(circle, black 50%, transparent 95%)",
                  WebkitMaskImage: "radial-gradient(circle, black 50%, transparent 95%)",
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <TCPHandshake />
                </div>
              </div>

                {/* Floating Badge: Protocol Security (Top Right) */}
                <motion.div 
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="absolute top-8 right-8 bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-3 flex items-center gap-3 shadow-xl"
                >
                  <div className="w-8 h-8 rounded bg-neon-purple/20 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-neon-purple" />
                  </div>
                  <div>
                    <div className="text-[10px] text-white/40 tracking-wider">PROTOCOL SECURITY</div>
                    <div className="text-xs font-bold text-white">SHA-256 ENCRYPTED</div>
                  </div>
                </motion.div>

                {/* Floating Badge: Connection Latency (Bottom Left) */}
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="absolute bottom-8 left-8 bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-3 flex items-center gap-3 shadow-xl"
                >
                  <div className="w-8 h-8 rounded bg-electric-cyan/20 flex items-center justify-center">
                    <Cloud className="w-4 h-4 text-electric-cyan" />
                  </div>
                  <div>
                    <div className="text-[10px] text-white/40 tracking-wider">CONNECTION LATENCY</div>
                    <div className="text-xs font-bold text-white">12.4 MS AVERAGE</div>
                  </div>
                </motion.div>

                {/* Floating Action Buttons (Right Side) */}
                <div className="absolute top-20 right-4 flex flex-col gap-2">
                  <button className="w-8 h-8 rounded-full bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                    <Search className="w-3 h-3 text-white" />
                  </button>
                  <button className="w-8 h-8 rounded-full bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                    <Info className="w-3 h-3 text-white" />
                  </button>
                </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Bottom Status Line - dark base, accent glow */}
      <div className="relative z-30 h-8 bg-black/50 backdrop-blur border-t border-[rgba(0,255,255,0.2)] flex items-center justify-between px-4 text-xs font-mono uppercase tracking-wider">
        <div className="flex items-center gap-4 text-white/25">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_4px_hsl(130,100%,50%)]" />
            LIVE SERVER NODE: HK-01
          </div>
          <span>UPTIME: 242:12:05:44</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-electric-cyan drop-shadow-[0_0_6px_hsl(var(--electric-cyan)/0.6)]">PRT_443: LISTENING</span>
          <span className="text-neon-purple/90 drop-shadow-[0_0_6px_hsl(var(--neon-purple)/0.5)]">PRT_80: REDIRECT</span>
          <span className="text-white/20">BUILD_V2.4.0-STABLE</span>
        </div>
      </div>
    </section>
  );
};

export default Hero;
