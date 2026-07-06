"use client";

import { useEffect, useState } from "react";
import { indexOverrides, type OverrideIndex, type SpotOverride } from "@/lib/overrides";

// Fetches the runtime override patch layer once on load and hands back a lookup.
// Fails soft in every direction — no DB, a 5xx, a network blip — so the static
// map is never blocked or broken by it. Empty until (and unless) it resolves.

const EMPTY: OverrideIndex = new Map();

export function useOverrides(): OverrideIndex {
  const [index, setIndex] = useState<OverrideIndex>(EMPTY);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch("/api/overrides", { signal: controller.signal });
        if (!active || !res.ok) return;
        const data = await res.json();
        if (!active) return;
        const list: SpotOverride[] = Array.isArray(data.overrides) ? data.overrides : [];
        setIndex(indexOverrides(list));
      } catch {
        // Soft patch layer — any failure just means "no overrides".
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return index;
}
