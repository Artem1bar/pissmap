"use client";

import { useSyncExternalStore } from "react";
import {
  draftToStored,
  readUserSpots,
  storedToSpot,
  USER_SPOTS_KEY,
  writeUserSpots,
  type UserSpotDraft,
} from "@/lib/userSpots";
import type { Spot } from "@/lib/types";

let cache: Spot[] | null = null;
const listeners = new Set<() => void>();
const EMPTY: Spot[] = [];

function refresh(): void {
  cache = readUserSpots().map(storedToSpot);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === USER_SPOTS_KEY) refresh();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): Spot[] {
  cache ??= readUserSpots().map(storedToSpot);
  return cache;
}

function getServerSnapshot(): Spot[] {
  return EMPTY;
}

/** The visitor's own spots, live-updating; empty during SSR/hydration. */
export function useUserSpots(): Spot[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function addUserSpot(draft: UserSpotDraft): string {
  const id = `user-${Math.random().toString(36).slice(2, 9)}`;
  const stored = draftToStored(draft, id, new Date().toISOString());
  writeUserSpots([...readUserSpots(), stored]);
  refresh();
  return id;
}

export function removeUserSpot(id: string): void {
  writeUserSpots(readUserSpots().filter((s) => s.id !== id));
  refresh();
}
