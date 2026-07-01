interface IconProps {
  className?: string;
}

/** The logo droplet — tip up, like an actual drop. */
export function DropletLogo({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 1.6C12 1.6 5 10.4 5 15.2a7 7 0 0 0 14 0C19 10.4 12 1.6 12 1.6Z"
        fill="currentColor"
      />
      <circle cx="9.4" cy="14.6" r="2" fill="#0b0c0f" opacity="0.28" />
    </svg>
  );
}

/** Map-pin teardrop pointing down; used for the marker SVG string too. */
export function pinSvg(color: string, size = 30): string {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">
    <path d="M12 23C12 23 4.5 13.9 4.5 8.9A7.5 7.5 0 0 1 19.5 8.9C19.5 13.9 12 23 12 23Z" fill="${color}" stroke="#0b0c0f" stroke-width="1.4"/>
    <circle cx="12" cy="9.1" r="3" fill="#0b0c0f" opacity="0.5"/>
  </svg>`;
}

export function LocateIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 1.5v3.5M12 19v3.5M1.5 12H5M19 12h3.5" strokeLinecap="round" />
    </svg>
  );
}

export function DirectionsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M21.7 10.9 13.1 2.3a1.55 1.55 0 0 0-2.2 0l-8.6 8.6a1.55 1.55 0 0 0 0 2.2l8.6 8.6c.6.6 1.6.6 2.2 0l8.6-8.6c.6-.6.6-1.6 0-2.2ZM14 14.5V12h-3.5a.5.5 0 0 0-.5.5V15H8v-2.5A2.5 2.5 0 0 1 10.5 10H14V7.5l3.5 3.5-3.5 3.5Z" />
    </svg>
  );
}

export function CopyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M4 12.5 9.5 18 20 6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M5 5l14 14M19 5 5 19" strokeLinecap="round" />
    </svg>
  );
}

export function BackIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WheelchairIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="4" r="2" />
      <path d="M11 7h2v4h4v2h-4v0.5A5.5 5.5 0 1 1 6.6 11l1.2 1.7A3.5 3.5 0 1 0 13 16.5V7z" />
      <path d="M15.5 13.5h2.2l2 5-1.8.8-1.6-3.8h-.8z" />
    </svg>
  );
}
