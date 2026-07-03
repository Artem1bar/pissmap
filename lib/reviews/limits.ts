// Plain numeric limits with zero dependencies, safe to import from client
// components (the composer) and the server validator alike. Kept out of
// validate.ts so the browser never pulls in node:crypto.

export const BODY_MAX = 280;
export const NICKNAME_MAX = 24;
/** A human takes at least a few seconds to rate + type. Below this, it's a bot. */
export const MIN_COMPOSE_MS = 3000;
export const RATE_HOUR_MAX = 3;
export const RATE_DAY_MAX = 10;
