"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORIES, CATEGORY_META } from "@/lib/categories";
import { NAME_MAX, TIP_MAX, validateDraft, type UserSpotDraft } from "@/lib/userSpots";
import type { Category } from "@/lib/types";
import { CloseIcon } from "./icons";

interface AddSpotModalProps {
  /** Pin location chosen on the map; null keeps the dialog closed. */
  coords: { lat: number; lng: number } | null;
  onSave: (draft: UserSpotDraft) => void;
  onClose: () => void;
}

export default function AddSpotModal({ coords, onSave, onClose }: AddSpotModalProps) {
  const ref = useRef<HTMLDialogElement | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("customers");
  const [tip, setTip] = useState("");
  const [open24h, setOpen24h] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (coords && !dialog.open) {
      setName("");
      setCategory("customers");
      setTip("");
      setOpen24h(false);
      setError(null);
      dialog.showModal();
    } else if (!coords && dialog.open) {
      dialog.close();
    }
  }, [coords]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coords) return;
    const draft: UserSpotDraft = { name, category, tip, lat: coords.lat, lng: coords.lng, open24h };
    const problem = validateDraft(draft);
    if (problem) {
      setError(problem);
      return;
    }
    onSave(draft);
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="m-auto w-[min(92vw,440px)] rounded-2xl border border-night-600 bg-night-900 p-0 text-ink-100 shadow-2xl backdrop:bg-transparent"
    >
      <form onSubmit={submit} className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">Add your spot</h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Saved only on this device
              {coords ? ` · pin at ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : ""}
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

        <label className="mt-4 block text-xs font-medium text-ink-300">
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX}
            placeholder="e.g. Friendly bar on Chartres"
            className="mt-1 w-full rounded-lg border border-night-600 bg-night-800 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-gold-600 focus:outline-none"
          />
        </label>

        <fieldset className="mt-3">
          <legend className="text-xs font-medium text-ink-300">Category</legend>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  category === c
                    ? "border-gold-600 bg-gold-400/15 text-gold-300"
                    : "border-night-600 bg-night-800 text-ink-300 hover:border-night-400"
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: CATEGORY_META[c].color }}
                  aria-hidden="true"
                />
                {CATEGORY_META[c].label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mt-3 block text-xs font-medium text-ink-300">
          Description / tips
          <textarea
            value={tip}
            onChange={(e) => setTip(e.target.value)}
            maxLength={TIP_MAX}
            rows={3}
            placeholder="What should someone know? (door code, buy a drink first, which floor…)"
            className="mt-1 w-full resize-none rounded-lg border border-night-600 bg-night-800 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-gold-600 focus:outline-none"
          />
          <span className="mt-0.5 block text-right text-[10px] text-ink-500">
            {tip.length}/{TIP_MAX}
          </span>
        </label>

        <label className="mt-1 flex items-center gap-2 text-sm text-ink-300">
          <input
            type="checkbox"
            checked={open24h}
            onChange={(e) => setOpen24h(e.target.checked)}
            className="h-4 w-4 accent-gold-400"
          />
          Open 24/7 (otherwise shown as &ldquo;hours unknown&rdquo;)
        </label>

        {error ? (
          <p role="alert" className="mt-3 rounded-lg border border-shut/30 bg-shut/10 px-3 py-2 text-xs text-shut">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-gold-400 px-4 py-2.5 text-sm font-bold text-night-950 transition-colors hover:bg-gold-300"
          >
            Save spot
          </button>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="rounded-xl border border-night-600 px-4 py-2.5 text-sm font-medium text-ink-300 transition-colors hover:border-night-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}
