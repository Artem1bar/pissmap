import Link from "next/link";
import { CATEGORY_META } from "@/lib/categories";
import { DATA_COMPILED } from "@/lib/constants";
import { formatDistance, walkMinutes } from "@/lib/geo";
import type { LocalTime, Spot } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import { ReviewTicker } from "./reviews/ReviewTicker";
import { LocateIcon, WheelchairIcon } from "./icons";

export interface SpotListItem {
  spot: Spot;
  meters: number | null;
}

interface SpotListProps {
  items: readonly SpotListItem[];
  now: LocalTime | null;
  onSelect: (id: string) => void;
  hasLocation: boolean;
  locating: boolean;
  locationError: string | null;
  onLocate: () => void;
  onReset: () => void;
}

export default function SpotList({
  items,
  now,
  onSelect,
  hasLocation,
  locating,
  locationError,
  onLocate,
  onReset,
}: SpotListProps) {
  return (
    <div className="flex flex-col">
      <ReviewTicker onSelect={onSelect} />
      <div className="flex items-center justify-between gap-2 px-4 pb-1.5 pt-3 md:px-5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-ink-500">
          {items.length} spot{items.length === 1 ? "" : "s"}
          {hasLocation ? " · nearest first" : ""}
        </p>
        <button
          type="button"
          onClick={onLocate}
          disabled={locating}
          className="flex items-center gap-1.5 rounded-full border border-night-600 bg-night-800 px-2.5 py-1 text-[11px] font-medium text-ink-300 transition-colors hover:border-gold-600 hover:text-gold-300 disabled:opacity-60"
        >
          <LocateIcon className="h-3 w-3" />
          {locating ? "Locating…" : hasLocation ? "Update location" : "Near me"}
        </button>
      </div>
      {locationError ? (
        <p role="status" className="px-4 pb-1 text-[11px] text-soon md:px-5">
          {locationError}
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="px-4 py-10 text-center md:px-5">
          <p className="text-3xl" aria-hidden="true">
            🚽
          </p>
          <p className="mt-2 text-sm font-medium text-ink-300">Nothing matches those filters.</p>
          <p className="mt-1 text-xs text-ink-500">Loosen up — your bladder would.</p>
          <button
            type="button"
            onClick={onReset}
            className="mt-3 rounded-full border border-gold-600 px-3.5 py-1.5 text-xs font-medium text-gold-300 transition-colors hover:bg-gold-400/10"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <ul>
          {items.map(({ spot, meters }) => (
            <li key={spot.id}>
              <button
                type="button"
                onClick={() => onSelect(spot.id)}
                className="flex w-full items-start gap-3 border-b border-night-700 px-4 py-3 text-left transition-colors hover:bg-night-800 md:px-5"
              >
                <span
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: CATEGORY_META[spot.category].color }}
                  aria-label={CATEGORY_META[spot.category].label}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-100">
                    <span className="truncate">{spot.name}</span>
                    {spot.wheelchair ? (
                      <WheelchairIcon className="h-3.5 w-3.5 shrink-0 text-ink-500" />
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-500">
                    {spot.neighborhood}
                    {meters !== null ? (
                      <>
                        {" "}
                        · {formatDistance(meters)} · {walkMinutes(meters)} min walk
                      </>
                    ) : null}
                  </span>
                </span>
                <StatusBadge hours={spot.hours} now={now} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <footer className="px-4 py-4 text-[11px] leading-relaxed text-ink-500 md:px-5">
        <p>
          <span aria-hidden="true">⚜</span> Local knowledge +{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-night-400 underline-offset-2 hover:text-ink-300"
          >
            © OpenStreetMap
          </a>{" "}
          contributors · basemap{" "}
          <a
            href="https://carto.com/attributions"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-night-400 underline-offset-2 hover:text-ink-300"
          >
            © CARTO
          </a>{" "}
          · compiled {DATA_COMPILED}.
        </p>
        <p className="mt-1.5">
          Public urination is a citable offense in New Orleans. This map exists so you never find
          out exactly how citable.
        </p>
        <p className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-ink-500">
          <Link href="/press" className="hover:text-gold-300">
            Press
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/partners" className="hover:text-gold-300">
            Partners
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/stickers" className="hover:text-gold-300">
            Stickers
          </Link>
        </p>
      </footer>
    </div>
  );
}
