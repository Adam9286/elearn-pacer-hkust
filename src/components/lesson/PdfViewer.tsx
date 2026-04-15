// Abstracted PDF Viewer Component
// This wraps the PDF display logic so it can be swapped later

import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";

interface PdfViewerProps {
  pdfUrl: string;
  currentPage: number;
  onPageChange?: (page: number) => void;
  totalPages?: number;
  className?: string;
  title?: string;
}

const PdfViewer = ({
  pdfUrl,
  currentPage,
  onPageChange,
  totalPages,
  className,
  title = "PDF Viewer",
}: PdfViewerProps) => {
  void onPageChange;
  void totalPages;

  if (!pdfUrl) {
    return (
      <div
        className={cn(
          "flex aspect-video items-center justify-center rounded-[24px] border border-white/8 bg-black/10",
          className
        )}
      >
        <div className="text-center text-muted-foreground">
          <FileText className="mx-auto mb-2 h-12 w-12 opacity-50" />
          <p>No PDF available for this lesson</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-xs text-muted-foreground">
        Use the PDF controls inside the slide viewer. The tutor is currently focused on Slide {currentPage}.
      </p>

      <div className="aspect-[4/3] overflow-hidden rounded-[24px] border border-white/8 bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] lg:aspect-auto lg:h-[75vh] lg:min-h-[600px] lg:max-h-[850px]">
        <iframe
          src={pdfUrl}
          className="h-full w-full"
          title={title}
          allow="autoplay"
        />
      </div>
    </div>
  );
};

export default PdfViewer;
