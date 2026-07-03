"use client";

import { useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { Sticker } from "@/components/growth/Sticker";
import { DropletLogo } from "@/components/icons";
import { useQrSvg } from "@/components/QrCode";
import { getSpotById, SPOTS } from "@/lib/spots";

interface StickerStudioProps {
  baseUrl: string;
  realDomain: boolean;
}

export default function StickerStudio({ baseUrl, realDomain }: StickerStudioProps) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState<"single" | "sheet">("sheet");

  const q = query.trim().toLowerCase();
  const matches =
    q.length === 0
      ? []
      : SPOTS.filter(
          (s) => s.name.toLowerCase().includes(q) || s.neighborhood.toLowerCase().includes(q),
        ).slice(0, 8);

  const selected = selectedId ? getSpotById(selectedId) : null;
  const value = selected ? `${baseUrl}/s/${selected.id}` : baseUrl;
  const subtitle = selected ? selected.name : `${SPOTS.length} places to pee in NOLA`;
  const qrSvg = useQrSvg(value);

  const print = (mode: "single" | "sheet") => {
    flushSync(() => setPrintMode(mode));
    window.print();
  };

  return (
    <div className="mx-auto min-h-dvh w-full max-w-4xl px-4 py-6 sm:px-6">
      <div className="no-print">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-gold-300"
        >
          <DropletLogo className="h-5 w-5 text-gold-400" />
          <span>
            PissMap <span className="font-bold text-gold-400">NOLA</span>
          </span>
          <span>· back to the map</span>
        </Link>

        <h1 className="mt-4 font-display text-3xl font-black italic">Sticker studio</h1>
        <p className="mt-1 max-w-xl text-sm text-ink-300">
          Make a scannable sticker for any spot — or the generic app sticker. The QR sends people
          to <code className="rounded bg-night-700 px-1 text-xs">/s/&lt;spot&gt;</code>, which logs
          the scan and drops them right on that pin.
        </p>

        {!realDomain ? (
          <div className="mt-4 rounded-xl border border-soon/40 bg-soon/10 px-4 py-3 text-sm text-soon">
            <strong>Don&apos;t print yet.</strong> No real domain is configured, so these codes
            point at <code className="rounded bg-night-800 px-1 text-xs">{baseUrl}</code>. Set{" "}
            <code className="rounded bg-night-800 px-1 text-xs">NEXT_PUBLIC_SITE_URL</code> to your
            live domain and redeploy first, or every sticker is a dead link.
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedId(null);
                  setQuery("");
                }}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  selected
                    ? "border border-night-600 text-ink-300 hover:border-gold-600"
                    : "bg-gold-400 text-night-950"
                }`}
              >
                Generic app sticker
              </button>
              {selected ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-600 bg-gold-400/10 px-3 py-1 text-sm text-gold-300">
                  {selected.name}
                  <button
                    type="button"
                    aria-label="Clear selection"
                    onClick={() => setSelectedId(null)}
                    className="text-gold-300 hover:text-gold-400"
                  >
                    ✕
                  </button>
                </span>
              ) : null}
            </div>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a spot to sticker…"
              className="mt-3 w-full rounded-xl border border-night-600 bg-night-800 px-3.5 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 focus:border-gold-600 focus:outline-none"
            />

            {matches.length > 0 ? (
              <ul className="mt-2 overflow-hidden rounded-xl border border-night-600">
                {matches.map((spot) => (
                  <li key={spot.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(spot.id);
                        setQuery("");
                      }}
                      className="flex w-full items-center justify-between gap-2 border-b border-night-700 px-3.5 py-2 text-left text-sm last:border-0 hover:bg-night-800"
                    >
                      <span className="truncate text-ink-100">{spot.name}</span>
                      <span className="shrink-0 text-xs text-ink-500">{spot.neighborhood}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <p className="mt-4 break-all text-xs text-ink-500">
              Encodes: <span className="text-ink-300">{value}</span>
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => print("single")}
                className="rounded-xl bg-gold-400 px-4 py-2.5 text-sm font-bold text-night-950 transition-colors hover:bg-gold-300"
              >
                Print one 3″ sticker
              </button>
              <button
                type="button"
                onClick={() => print("sheet")}
                className="rounded-xl border border-gold-600 px-4 py-2.5 text-sm font-bold text-gold-300 transition-colors hover:bg-gold-400/10"
              >
                Print a sheet of 9
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-ink-500">
              Preview
            </span>
            <Sticker qrSvg={qrSvg} subtitle={subtitle} sizeIn={3} />
          </div>
        </div>
      </div>

      {/* Print output — hidden on screen, shown by @media print. */}
      <div className="print-root">
        {printMode === "single" ? (
          <Sticker qrSvg={qrSvg} subtitle={subtitle} sizeIn={3} />
        ) : (
          Array.from({ length: 9 }).map((_, i) => (
            <Sticker key={i} qrSvg={qrSvg} subtitle={subtitle} sizeIn={2.4} />
          ))
        )}
      </div>
    </div>
  );
}
