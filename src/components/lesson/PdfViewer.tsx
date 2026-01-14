// Abstracted PDF Viewer Component
// This wraps the PDF display logic so it can be swapped later
// (e.g., from Google Drive iframe to PDF.js or react-pdf)

import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";

interface PdfViewerProps {
  pdfUrl: string;
  currentPage: number;
  onPageChange?: (page: number) => void;  // For future sync capability
  totalPages?: number;
  className?: string;
  title?: string;
}

/**
 * PdfViewer - Abstracted PDF display component
 * 
 * Currently uses Google Drive iframe (no page sync).
 * Parent controls `currentPage` even if viewer ignores it for now.
 * This abstraction allows swapping to PDF.js/react-pdf without
 * changing parent components.
 */
const PdfViewer = ({ 
  pdfUrl, 
  currentPage, 
  onPageChange, 
  totalPages,
  className,
  title = "PDF Viewer"
}: PdfViewerProps) => {
  // Note: Google Drive iframe doesn't support programmatic page navigation
  // When we switch to PDF.js, we'll use currentPage to control the view
  
  if (!pdfUrl) {
    return (
      <div className={cn(
        "aspect-video rounded-lg border bg-muted flex items-center justify-center",
        className
      )}>
        <div className="text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No PDF available for this lesson</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="aspect-video rounded-lg overflow-hidden border bg-muted">
        <iframe
          src={pdfUrl}
          className="w-full h-full"
          title={title}
          allow="autoplay"
        />
      </div>
      
      {/* Info bar - shows that navigation is independent */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>Navigate slides using the PDF viewer controls above</span>
        {totalPages && (
          <span>Section {currentPage} of {totalPages}</span>
        )}
      </div>
    </div>
  );
};

export default PdfViewer;
