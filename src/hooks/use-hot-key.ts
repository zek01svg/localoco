import { useEffect, useRef } from "react";

export function useHotKey(callback: () => void, key: string): void {
  // Callers pass inline arrows, so keep the listener stable and read the
  // latest callback through a ref instead of re-binding on every render.
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === key && (e.metaKey || e.ctrlKey)) {
        // e.preventDefault();
        callbackRef.current();
      }
    }

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [key]);
}
