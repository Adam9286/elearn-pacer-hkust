import { AlertTriangle } from 'lucide-react';

export const NoCitationNotice = () => {
  return (
    <div className="mt-4 pt-3 border-t border-border/30">
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <span className="font-medium text-amber-800 dark:text-amber-200">
            General Knowledge
          </span>
          <p className="text-amber-700 dark:text-amber-300/80 text-xs mt-0.5">
            This answer is based on general knowledge, not course materials. Verify with your slides.
          </p>
        </div>
      </div>
    </div>
  );
};
