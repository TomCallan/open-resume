import { useEffect, useRef } from "react";

const resizeListeners = new Set<() => void>();
let isGlobalResizeAttached = false;
let resizeRafId: number | null = null;

const onGlobalResize = () => {
  if (resizeRafId !== null) return;
  resizeRafId = window.requestAnimationFrame(() => {
    resizeRafId = null;
    resizeListeners.forEach((listener) => listener());
  });
};

const registerResizeListener = (listener: () => void) => {
  resizeListeners.add(listener);
  if (!isGlobalResizeAttached && typeof window !== "undefined") {
    window.addEventListener("resize", onGlobalResize);
    isGlobalResizeAttached = true;
  }
};

const unregisterResizeListener = (listener: () => void) => {
  resizeListeners.delete(listener);
  if (resizeListeners.size === 0 && isGlobalResizeAttached && typeof window !== "undefined") {
    window.removeEventListener("resize", onGlobalResize);
    isGlobalResizeAttached = false;
  }
};

/**
 * Hook to autosize textarea height.
 *
 * The trick to resize is to first set its height to 0 and then set it back to scroll height.
 * Reference: https://stackoverflow.com/a/25621277/7699841
 *
 * @example // Tailwind CSS
 * const textareaRef = useAutosizeTextareaHeight({ value });
 * <textarea ref={textareaRef} className="resize-none overflow-hidden"/>
 */
export const useAutosizeTextareaHeight = ({ value }: { value: string }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "0px";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  // Resize height when value changes
  useEffect(() => {
    resizeHeight();
  }, [value]);

  // Resize height on shared throttled window resize
  useEffect(() => {
    const handler = () => resizeHeight();
    registerResizeListener(handler);
    return () => unregisterResizeListener(handler);
  }, []);

  return textareaRef;
};

