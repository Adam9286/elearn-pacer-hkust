import { useCallback, useEffect, useRef, type RefObject } from "react";

interface AutosizeOptions {
  minHeight: number;
  maxHeight: number;
}

/**
 * Auto-grows a textarea while preserving manual vertical expansion.
 * When the value clears, the textarea resets back to its base height.
 */
export function useAutosizeTextarea(
  ref: RefObject<HTMLTextAreaElement>,
  value: string,
  { minHeight, maxHeight }: AutosizeOptions
) {
  const manualHeightRef = useRef<number | null>(null);
  const lastAutoHeightRef = useRef(minHeight);
  const resizeStartYRef = useRef<number | null>(null);
  const resizeStartHeightRef = useRef<number | null>(null);

  useEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;

    if (!value) {
      manualHeightRef.current = null;
      lastAutoHeightRef.current = minHeight;
      textarea.style.height = `${minHeight}px`;
      textarea.style.overflowY = "hidden";
      return;
    }

    textarea.style.height = "auto";

    const contentHeight = Math.min(
      maxHeight,
      Math.max(minHeight, textarea.scrollHeight)
    );

    const manualHeight = manualHeightRef.current ?? 0;
    const nextHeight = Math.min(maxHeight, Math.max(contentHeight, manualHeight));

    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = nextHeight >= maxHeight ? "auto" : "hidden";
    lastAutoHeightRef.current = contentHeight;
  }, [maxHeight, minHeight, ref, value]);

  const handleResizeDragStart = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const textarea = ref.current;
    if (!textarea) return;

    event.preventDefault();
    resizeStartYRef.current = event.clientY;
    resizeStartHeightRef.current = textarea.offsetHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const startY = resizeStartYRef.current;
      const startHeight = resizeStartHeightRef.current;
      const currentTextarea = ref.current;

      if (startY === null || startHeight === null || !currentTextarea) return;

      const delta = startY - moveEvent.clientY;
      const nextHeight = Math.min(
        maxHeight,
        Math.max(minHeight, startHeight + delta)
      );

      manualHeightRef.current =
        nextHeight > lastAutoHeightRef.current ? nextHeight : null;
      currentTextarea.style.height = `${nextHeight}px`;
      currentTextarea.style.overflowY =
        nextHeight >= maxHeight ? "auto" : "hidden";
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      resizeStartYRef.current = null;
      resizeStartHeightRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [maxHeight, minHeight, ref]);

  const resetHeight = useCallback(() => {
    const textarea = ref.current;
    if (!textarea) return;

    manualHeightRef.current = null;
    lastAutoHeightRef.current = minHeight;
    textarea.style.height = `${minHeight}px`;
    textarea.style.overflowY = "hidden";
  }, [minHeight, ref]);

  return {
    handleResizeDragStart,
    resetHeight,
  };
}
