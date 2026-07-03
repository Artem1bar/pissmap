# Overnight build notes

What an autonomous Opus 4.8 session built against [`OVERNIGHT-BRIEF.md`](OVERNIGHT-BRIEF.md),
and where it deviated (and why). Every phase left `main` shippable — build green, all tests
passing — and was committed and pushed on its own.

## What shipped (all 7 phases)

1. **Storage layer** — Drizzle schema (`reviews`, `scans`) with check constraints + indexes,
   a `getDb()`/`resolveDb()` seam that returns null with no `DATABASE_URL`, typed query helpers,
   salted-IP anti-spam, migrations, `.env.example`.
2. **Reviews API** — `POST /api/reviews` (validate → honeypot → rate limit → pending),
   `GET /api/reviews` + `/recent`, honest `503` with no DB.
3. **The Bowl** — pump.fun-style chat feed, droplet composer, optimistic pending bubbles, live
   ticker, graceful "coming soon."
4. **Moderation admin** — `/admin` console (login → pending/approved/scans), constant-time
   cookie auth, approve/reject/retract.
5. **Permalinks + QR** — 412 static `/spot/[id]` pages, per-spot metadata + OG, `AppShell` URL
   sync, `/s/[id]` scan redirect, scan counts in `/admin`.
6. **Growth kit** — `/stickers` QR studio, partner tier + ribbon, `/partners` + pitch one-pager,
   `/press` with live stats, `@vercel/analytics`.
7. **Docs + polish** — this file, README sections, About-modal review/policy line, final QA.

Tests: **51 → 133**. Build stays green with and without `DATABASE_URL`; the map route stays
static; the whole thing degrades gracefully with nothing configured.

## Deviations from the brief (and why)

- **Local dev database (`resolveDb()` + `npm run dev:local`).** The brief anticipated "a local
  PGlite dev server if feasible." Rather than only `getDb()`, there's an async `resolveDb()` that,
  in `next dev` with `PISSMAP_LOCAL_DB=1`, returns an in-memory PGlite store seeded on boot. This
  is what made real end-to-end QA possible (reviews, moderation, scans) without Neon. The dev
  branch is **dead-code-eliminated from the production build** (guarded by `NODE_ENV`), so PGlite
  never ships.
- **Per-spot OG images are generated on demand, not prerendered.** Prerendering 412 satori images
  would have added ~1 minute to every build (and the build runs before every commit). They're
  `ƒ` (dynamic) and CDN-cached instead; the 412 permalink **pages** are still fully static.
- **Dropped a misleading press stat.** 86% of spots carry the `verify` "hours may drift" flag, so
  a "% confirmed hours" stat read as 14% and undersold the data — `verify` flags *hours*, not the
  spot's existence. Replaced with honest, flattering stats (spots, neighborhoods, 24/7, accessible)
  and prose about the honesty policy. `confirmedHoursPct` is still computed in `lib/stats.ts` but
  not surfaced.
- **Admin cookies via headers, not `next/headers`.** Reading/writing the admin cookie through
  request/response headers (instead of the async `cookies()` helper) keeps the route handlers
  unit-testable with plain `Request` objects. All admin routes are still `no-store`.
- **Sticker sheet cells are 2.4″, not 3″.** A 3×3 grid of 3″ stickers is 9″ wide — wider than a
  Letter page's printable area. The sheet uses 2.4″ cells (3 across fits); the single sticker is a
  true 3″. One container-query component renders both sizes crisply.
- **Vitest config gained a `@/` alias + `app/**/*.test.ts` globbing** so the route handlers (which
  use `@/lib/...`) can be imported and tested directly. Existing tests use relative imports and are
  unaffected.
- **Reviews section is named "The Bowl."** The brief invited a better name than "chat window"; The
  Bowl fits the porcelain theme and the pump.fun-feed vibe.
- **Title separator is `·`** (matching the existing `%s · PissMap NOLA` template) rather than the
  brief's example `—`, for consistency with the app that already shipped.

## Notes for the morning

- The **partner ribbon exists but no spot has `partner` data yet**, so `/partners` shows its
  empty-state sell — exactly as the brief intended. To onboard a venue, add
  `partner: { deal: "…" }` to its entry in `lib/spots/`.
- `IP_SALT` should be set in production before real traffic; without it, IPs are hashed with an
  empty salt (still hashed, just not secret-salted).
- Nothing in the read path was rewritten — the 412-spot map, filters, GOTTA GEAUX, and add-a-spot
  all behave exactly as before.
