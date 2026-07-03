import Link from "next/link";
import { DropletLogo } from "@/components/icons";

interface PageShellProps {
  children: React.ReactNode;
  /** Hide the back link in print output (e.g. the pitch one-pager). */
  className?: string;
}

/** A centered, readable shell for the standalone growth pages, with a way home. */
export function PageShell({ children, className }: PageShellProps) {
  return (
    <div className={`mx-auto min-h-dvh w-full max-w-3xl px-4 py-6 sm:px-6 ${className ?? ""}`}>
      <Link
        href="/"
        className="no-print inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-gold-300"
      >
        <DropletLogo className="h-5 w-5 text-gold-400" />
        <span>
          PissMap <span className="font-bold text-gold-400">NOLA</span>
        </span>
        <span className="text-ink-500">· back to the map</span>
      </Link>
      {children}
    </div>
  );
}
