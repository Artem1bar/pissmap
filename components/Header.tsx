import { APP_TAGLINE } from "@/lib/constants";
import { DropletLogo } from "./icons";

interface HeaderProps {
  onAboutOpen: () => void;
}

export default function Header({ onAboutOpen }: HeaderProps) {
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
      <button
        type="button"
        onClick={onAboutOpen}
        className="shrink-0 rounded-full border border-night-600 bg-night-800 px-3.5 py-1.5 text-sm font-medium text-ink-300 transition-colors hover:border-gold-600 hover:text-gold-300"
      >
        Tips &amp; About
      </button>
    </header>
  );
}
