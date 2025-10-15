import { Award, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const UserStats = () => {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm">
        <TrendingUp className="w-4 h-4 text-accent" />
        <span className="text-sm font-semibold">1,250 XP</span>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm">
        <Award className="w-4 h-4 text-accent" />
        <span className="text-sm font-semibold">5 Badges</span>
      </div>
    </div>
  );
};

export default UserStats;
