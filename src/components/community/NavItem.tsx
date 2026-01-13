import React from 'react';
import { cn } from '@/lib/utils';

export type SectionType = 'announcements' | 'discussions' | 'feedback';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  section: SectionType;
  activeSection: SectionType;
  unreadCount: number;
  onSectionClick: (section: SectionType) => void;
}

export const NavItem = React.memo(({
  icon: Icon,
  label,
  section,
  activeSection,
  unreadCount,
  onSectionClick,
}: NavItemProps) => {
  return (
    <button
      onClick={() => onSectionClick(section)}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
        "hover:bg-accent/10 group relative",
        activeSection === section && "bg-accent/20"
      )}
    >
      {/* Active indicator bar */}
      <div className={cn(
        "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full transition-all duration-200",
        activeSection === section ? "bg-primary opacity-100" : "opacity-0"
      )} />
      
      <div className={cn(
        "p-2 rounded-lg transition-colors relative",
        activeSection === section 
          ? "bg-primary/20 text-primary" 
          : "bg-muted/50 text-muted-foreground group-hover:bg-muted group-hover:text-foreground"
      )}>
        <Icon className="w-5 h-5" />
        {/* Notification dot */}
        {unreadCount > 0 && activeSection !== section && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-destructive rounded-full animate-pulse" />
        )}
      </div>
      
      <span className={cn(
        "flex-1 text-left font-medium transition-colors",
        activeSection === section ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
      )}>
        {label}
      </span>
    </button>
  );
});

NavItem.displayName = 'NavItem';
