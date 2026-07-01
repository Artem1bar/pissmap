interface EmergencyButtonProps {
  onClick: () => void;
  finding: boolean;
  className?: string;
}

export default function EmergencyButton({ onClick, finding, className = "" }: EmergencyButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={finding}
      aria-label="Find the nearest open restroom now"
      aria-live="polite"
      className={`geaux-btn flex items-center gap-2 rounded-full bg-gold-400 px-5 py-3 text-sm font-extrabold tracking-wide text-night-950 shadow-[0_4px_20px_rgba(247,201,72,0.4)] transition-transform hover:scale-105 active:scale-95 disabled:cursor-wait ${className}`}
    >
      {finding ? (
        <>
          <span
            className="spinner inline-block h-4 w-4 rounded-full border-2 border-night-950 border-t-transparent"
            aria-hidden="true"
          />
          FINDING RELIEF…
        </>
      ) : (
        <>
          <span aria-hidden="true">🚨</span> GOTTA GEAUX
        </>
      )}
    </button>
  );
}
