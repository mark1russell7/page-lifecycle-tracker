import { useEffect, useState, useSyncExternalStore } from "react";

/** This hook gives a value of `read()` again each `intervalMs` milliseconds. */
export function useTicker<T>(read: () => T, intervalMs: number): T {
  const [value, setValue] = useState(read);
  useEffect(() => {
    const timer = window.setInterval(() => setValue(read()), intervalMs);
    return () => window.clearInterval(timer);
  }, [read, intervalMs]);
  return value;
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToMotion(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** True if the reader asked the system for less motion. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToMotion,
    () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}
