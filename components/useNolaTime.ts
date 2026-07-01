"use client";

import { useSyncExternalStore } from "react";
import { nolaTime } from "@/lib/hours";
import type { LocalTime } from "@/lib/types";

let cached: LocalTime | null = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function tick(): void {
  const next = nolaTime();
  if (!cached || next.day !== cached.day || next.minutes !== cached.minutes) {
    cached = next;
    for (const listener of listeners) listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (timer === null) timer = setInterval(tick, 30_000);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function getSnapshot(): LocalTime {
  cached ??= nolaTime();
  return cached;
}

function getServerSnapshot(): LocalTime | null {
  return null;
}

/**
 * New Orleans wall-clock time, refreshed every 30 seconds.
 * `null` during SSR and the hydration pass, so server and client markup agree.
 */
export function useNolaTime(): LocalTime | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
