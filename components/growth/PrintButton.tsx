"use client";

/** A print / save-as-PDF trigger that hides itself in the printed output. */
export function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-full border border-gold-600 px-4 py-1.5 text-sm font-medium text-gold-300 transition-colors hover:bg-gold-400/10"
    >
      {label}
    </button>
  );
}
