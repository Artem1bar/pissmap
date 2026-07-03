// Pure presentation helpers for the review chat: compact relative timestamps,
// deterministic hash-colored nicknames, and anonymous critter handles. No React,
// no DOM — all unit-tested.

/** "just now", "2m", "3h", "2d", "3w", "5mo", "1y" — chat-compact, never negative. */
export function relativeTime(iso: string, nowMs: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.max(0, Math.floor((nowMs - then) / 1000));
  if (secs < 45) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${Math.max(1, months)}mo`;
  return `${Math.floor(days / 365)}y`;
}

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * A stable, punchy color for a nickname chip — readable on the near-black
 * background. Same input always yields the same hue.
 */
export function nicknameColor(seed: string): string {
  const hue = hash(seed) % 360;
  return `hsl(${hue} 72% 68%)`;
}

/** NOLA-flavored critters for anonymous reviewers. */
const CRITTERS = ["🐊", "⚜️", "🎷", "🎭", "🦩", "🍤", "🎺", "🌙", "🃏", "🪗"];

/** A deterministic anonymous handle like "anon 🐊" for a blank nickname. */
export function anonName(seed: string): string {
  const emoji = CRITTERS[hash(seed) % CRITTERS.length];
  return `anon ${emoji}`;
}

/** The name to show for a review: the nickname, or a stable anonymous critter. */
export function displayName(nickname: string | null, seed: string): string {
  const trimmed = nickname?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : anonName(seed);
}
