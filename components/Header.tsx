import { APP_TAGLINE } from "@/lib/constants";
import { DropletLogo, PlusIcon } from "./icons";

interface HeaderProps {
  onAboutOpen: () => void;
  onAddSpot: () => void;
}

export default function Header({ onAboutOpen, onAddSpot }: HeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-night-600 bg-night-900 px-4 py-2.5 sm:px-5">
      <div className="flex items-center gap-2.5">
        <DropletLogo className="h-8 w-8 shrink-0 text-gold-400" />
        <div className="leading-tight">
          <h1 className="font-display text-xl font-black italic tracking-tight sm:text-2xl">
            PissMap <span className="text-gold-400">NOLA</span>
          </h1>
          <p className="hidden text-[11px] text-ink-500 sm:block">
            {APP_TAGLINE} <span aria-hidden="true">⚜</span>
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onAddSpot}
          className="flex items-center gap-1.5 rounded-full border border-gold-600 bg-gold-400/10 px-3.5 py-1.5 text-sm font-medium text-gold-300 transition-colors hover:bg-gold-400/20"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Add spot</span>
          <span className="sm:hidden">Add</span>
        </button>
        <button
          type="button"
          onClick={onAboutOpen}
          className="rounded-full border border-night-600 bg-night-800 px-3.5 py-1.5 text-sm font-medium text-ink-300 transition-colors hover:border-gold-600 hover:text-gold-300"
        >
          <span className="hidden sm:inline">Tips &amp; About</span>
          <span className="sm:hidden">Tips</span>
        </button>
      </div>
    </header>
  );
}
