import { CATEGORIES, CATEGORY_META } from "@/lib/categories";
import { DEFAULT_FILTERS, toggleCategory, type Filters } from "@/lib/filters";
import type { Category } from "@/lib/types";
import { CloseIcon } from "./icons";

interface FilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  shown: number;
  total: number;
}

interface ChipProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  dotColor?: string;
}

function Chip({ active, onClick, children, dotColor }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-gold-600 bg-gold-400/15 text-gold-300"
          : "border-night-600 bg-night-800 text-ink-300 hover:border-night-400"
      }`}
    >
      {dotColor ? (
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: dotColor }}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </button>
  );
}

export default function FilterBar({ filters, onChange, shown, total }: FilterBarProps) {
  const isDefault =
    filters.categories.length === 0 &&
    !filters.openNow &&
    !filters.allNight &&
    filters.query === "";

  const toggle = (category: Category) => onChange(toggleCategory(filters, category));

  return (
    <div className="flex flex-col gap-2 border-b border-night-600 bg-night-900 px-4 py-2.5 sm:px-5 md:flex-row md:items-center">
      <input
        type="search"
        value={filters.query}
        onChange={(e) => onChange({ ...filters, query: e.target.value })}
        placeholder="Search spots, neighborhoods…"
        aria-label="Search spots"
        className="w-full rounded-lg border border-night-600 bg-night-800 px-3 py-1.5 text-sm text-ink-100 placeholder:text-ink-500 focus:border-gold-600 focus:outline-none md:w-60"
      />
      <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:px-0 md:flex-1 md:flex-wrap md:overflow-visible">
        {CATEGORIES.map((category) => (
          <Chip
            key={category}
            active={filters.categories.includes(category)}
            onClick={() => toggle(category)}
            dotColor={CATEGORY_META[category].color}
          >
            {CATEGORY_META[category].label}
          </Chip>
        ))}
        <span className="h-5 w-px shrink-0 bg-night-600" aria-hidden="true" />
        <Chip
          active={filters.openNow}
          onClick={() => onChange({ ...filters, openNow: !filters.openNow })}
        >
          Open now
        </Chip>
        <Chip
          active={filters.allNight}
          onClick={() => onChange({ ...filters, allNight: !filters.allNight })}
        >
          24/7
        </Chip>
        {!isDefault && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1.5 text-xs text-ink-500 transition-colors hover:text-ink-100"
          >
            <CloseIcon className="h-3 w-3" /> Reset
          </button>
        )}
        <span className="ml-auto hidden shrink-0 text-xs tabular-nums text-ink-500 md:block">
          {shown} of {total}
        </span>
      </div>
    </div>
  );
}
