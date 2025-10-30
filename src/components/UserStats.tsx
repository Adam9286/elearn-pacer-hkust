import { Award, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const UserStats = () => {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-electric-cyan/15 to-neon-blue/15 border border-electric-cyan/20 hover:border-electric-cyan/40 hover:shadow-[0_0_15px_rgba(0,255,255,0.2)] transition-all duration-300 backdrop-blur-sm">
        <TrendingUp className="w-4 h-4 text-electric-cyan drop-shadow-[0_0_6px_rgba(0,255,255,0.6)]" />
        <span className="text-sm font-semibold text-white">1,250 XP</span>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-neon-purple/15 to-cyber-pink/15 border border-neon-purple/20 hover:border-neon-purple/40 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all duration-300 backdrop-blur-sm">
        <Award className="w-4 h-4 text-neon-purple drop-shadow-[0_0_6px_rgba(168,85,247,0.6)]" />
        <span className="text-sm font-semibold text-white">5 Badges</span>
      </div>
    </div>
  );
};

export default UserStats;
