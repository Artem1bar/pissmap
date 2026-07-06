"use client";

import { useEffect, useRef } from "react";
import { CATEGORIES, CATEGORY_META } from "@/lib/categories";
import { DATA_COMPILED } from "@/lib/constants";
import { GITHUB_ISSUES_URL } from "@/lib/links";
import { SPOTS } from "@/lib/spots";
import { CloseIcon } from "./icons";

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
  /** Starts the add-a-spot flow — the standalone path into suggesting a spot. */
  onAddSpot?: () => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-5 font-display text-base font-bold text-gold-300">{children}</h3>
  );
}

export default function AboutModal({ open, onClose, onAddSpot }: AboutModalProps) {
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="m-auto w-[min(92vw,560px)] rounded-2xl border border-night-600 bg-night-900 p-0 text-ink-100 shadow-2xl backdrop:bg-transparent"
    >
      <div className="max-h-[82dvh] overflow-y-auto p-5 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-black italic">
              PissMap <span className="text-gold-400">NOLA</span>
            </h2>
            <p className="mt-0.5 text-sm text-ink-500">
              when you gotta geaux <span aria-hidden="true">⚜</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Close"
            className="rounded-full p-1.5 text-ink-500 transition-colors hover:bg-night-700 hover:text-ink-100"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-ink-300">
          New Orleans hands you a drink for the street, then offers you nowhere to put it. This map
          is the fix:{" "}
          <strong className="text-ink-100">{SPOTS.length} field-vetted places to pee</strong> —
          free public restrooms, cheap-purchase spots, and hotel lobbies for the bold.
        </p>

        <SectionTitle>How to read the map</SectionTitle>
        <ul className="mt-2 space-y-2">
          {CATEGORIES.map((category) => (
            <li key={category} className="flex items-start gap-2.5 text-sm text-ink-300">
              <span
                className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: CATEGORY_META[category].color }}
                aria-hidden="true"
              />
              <span>
                <strong className="text-ink-100">{CATEGORY_META[category].label}.</strong>{" "}
                {CATEGORY_META[category].blurb}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-ink-500">
          Yes, those are the Mardi Gras colors — purple for justice, green for faith, gold for
          power. And now all three for relief.
        </p>

        <SectionTitle>The unwritten rules</SectionTitle>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-300">
          <li>
            <strong className="text-ink-100">Malls, markets, and museums first.</strong> Free,
            air-conditioned, and nobody checks receipts.
          </li>
          <li>
            <strong className="text-ink-100">At a bar, buy the cheapest thing.</strong> A soda
            water is a fair toll — and thanks to go-cup culture, you can take it with you.
          </li>
          <li>
            <strong className="text-ink-100">The hotel lobby walk:</strong> shoulders back, phone
            in hand, aim for the elevators, peel off at the restroom sign. Works nearly anywhere
            with marble floors.
          </li>
          <li>
            <strong className="text-ink-100">After midnight, think casino.</strong> Caesars never
            closes. Neither does Déjà Vu. The Quarter provides.
          </li>
          <li>
            <strong className="text-ink-100">During Mardi Gras,</strong> use the porta-potties or
            pay the couple of dollars businesses charge for restroom access. Best money you will
            spend all Carnival.
          </li>
        </ol>

        <SectionTitle>The Bowl — community reviews</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-ink-300">
          Every spot has a live review feed: rate the porcelain in golden droplets and leave a note
          for the next desperate soul. Reviews are anonymous — no accounts, ever — and{" "}
          <strong className="text-ink-100">moderated before they go live</strong>. Keep it useful
          and kind: no doxxing, no hate, no fake spots. See something that shouldn&apos;t be here?{" "}
          <a
            href={GITHUB_ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-night-400 underline-offset-2 hover:text-gold-300"
          >
            Flag it on GitHub
          </a>{" "}
          and it comes down.
        </p>

        <SectionTitle>Spot wrong? Spot missing?</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-ink-300">
          Closed, moved, or the hours are off? Tap{" "}
          <strong className="text-ink-100">&ldquo;Something wrong with this spot?&rdquo;</strong> on
          any spot to flag it — a moderator patches the live map without waiting for a redeploy. Know
          a spot we&apos;re missing?{" "}
          <button
            type="button"
            onClick={() => {
              ref.current?.close();
              onAddSpot?.();
            }}
            className="font-medium text-gold-300 underline decoration-night-400 underline-offset-2 hover:text-gold-200"
          >
            Add it to your map
          </button>{" "}
          and submit it for review. Everything&apos;s moderated before it reaches the public map.
        </p>

        <SectionTitle>The legal bit</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-ink-300">
          Public urination is a citable municipal offense in New Orleans, and police really do
          write those tickets — especially around Bourbon Street and during Carnival. This app
          exists so you never have to test it. (Not legal advice. Not medical advice either. Just
          go before you gotta geaux.)
        </p>

        <SectionTitle>About the data</SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-ink-300">
          Compiled {DATA_COMPILED} from OpenStreetMap — restrooms tagged{" "}
          <code className="rounded bg-night-700 px-1 py-0.5 text-xs">amenity=toilets</code>, some
          checked as recently as 2026 — plus local knowledge, then expanded citywide by a 50-agent
          research sweep in which every candidate spot was independently fact-checked against live
          sources before earning a pin. Spots with a caution note have best-effort hours: New
          Orleans hours are a jazz standard, and everyone plays them differently.
        </p>
        <p className="mt-3 text-xs leading-relaxed text-ink-500">
          Map data{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-night-400 underline-offset-2 hover:text-ink-300"
          >
            © OpenStreetMap contributors
          </a>{" "}
          · basemap{" "}
          <a
            href="https://carto.com/attributions"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-night-400 underline-offset-2 hover:text-ink-300"
          >
            © CARTO
          </a>{" "}
          · built with MapLibre GL and Next.js. Not affiliated with the City of New Orleans,
          obviously.
        </p>
      </div>
    </dialog>
  );
}
