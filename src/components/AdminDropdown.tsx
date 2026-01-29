import { Shield, Wrench, FileEdit } from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useUserProgress } from "@/contexts/UserProgressContext";

const AdminDropdown = () => {
  const { devMode, setDevMode, isAdmin, user } = useUserProgress();

  // Only render for admin users
  if (!user || !isAdmin) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <span className="hidden sm:inline">Admin</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover border border-border shadow-lg z-50">
        {/* Lecture Review Link */}
        <DropdownMenuItem asChild>
          <Link to="/admin/review-slides" className="flex items-center gap-2 cursor-pointer">
            <FileEdit className="w-4 h-4" />
            Review Slides
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Dev Mode Toggle */}
        <div className="px-2 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Wrench className="w-4 h-4" />
              <span>Dev Mode</span>
            </div>
            <Switch
              checked={devMode}
              onCheckedChange={setDevMode}
            />
          </div>
          {devMode && (
            <Badge variant="outline" className="mt-2 border-yellow-500 text-yellow-500 text-xs">
              All sections unlocked
            </Badge>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AdminDropdown;
