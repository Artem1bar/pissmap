# Overnight build notes #2 — From Built to Launched

What an autonomous Opus 4.8 session built against
[`OVERNIGHT-BRIEF-2.md`](OVERNIGHT-BRIEF-2.md), and where it deviated (and why).
Every phase left `main` shippable — typecheck / lint / tests / build all green —
and was committed and pushed on its own.

## What shipped (all 6 phases)

1. **Launch runway** — `GET /api/health` (secret-free readiness probe: db status,
   admin, siteUrl, spots, commit); `npm run preflight [url]` (7-check LAUNCH READY
   verdict); `app/sitemap.ts` (417 URLs) + `app/robots.ts`; schema.org JSON-LD
   `Place` on every `/spot/[id]`; an admin **System** tab (config + live counts).
2. **Community data-repair loop** — a "report a problem" control on every spot
   (`reports` table, reason chips, ≤200-char detail, 5/day per IP); a runtime
   **overrides** layer (`hide` drops a spot everywhere, `warn` shows an amber
   banner) set from the admin **Reports** tab; `GET /api/overrides` cached +
   fail-open. Pure merge logic in `lib/overrides.ts`.
3. **Suggest-a-spot pipeline** — "submit to the public map" from a personal pin
   (and the About modal) → `suggestions` table (3/day per IP) → admin
   **Suggestions** tab → Accept yields a copy-ready dataset entry
   (`formatSuggestionEntry`) a human verifies and merges. Runtime never edits
   dataset code.
4. **Scale & UX polish** — low-zoom pin declutter (dots below zoom 12.5);
   `GET /api/reviews/aggregates` + list-row 💧 badges (≥3 reviews); a sort control
   (Neighborhood grouping / Nearest / Top / Recent) in `lib/listSort.ts`.
5. **Launch execution kit** — `docs/launch/`: PRESS-PITCH, STICKER-ROLLOUT,
   PARTNER-PLAYBOOK, SOCIAL-PACK. Every number grounded in `lib/stats.ts`.
6. **Hardening & final QA** — security review (no CRITICAL/HIGH), validation
   parity check, README + `.env.example` refresh, IP_SALT visibility in /admin,
   this file, and the final regression sweep.

Tests: **134 → 213**. Extracted `lib/antispam.ts` as the shared honeypot /
min-time / link-block / salted-IP kit so reviews, reports, and suggestions
compose over one implementation instead of three.

## Deviations from the brief (and why)

- **PWA offline service worker skipped** (the "only if the night has room"
  stretch). A fetch-intercepting service worker adds real risk to the zero-env
  read path — the one thing that must never break — for marginal benefit (map
  tiles are external CARTO CDN and can't be meaningfully precached anyway). The
  `manifest.webmanifest` already makes the app installable. Sanctioned skip per
  the brief; noted here.
- **Overrides + aggregates degrade to an empty 200, not a 503** (reviews still
  503 when unconfigured). Deliberate: these two feed the *map itself*, so they
  fail open — no DB, a 5xx, or a network blip just means "no overrides / no
  badges," never a broken map. Rule 2 over consistency.
- **`/api/reviews/aggregates` returns `{spotId, avg, count, lastAt}`** — one
  field beyond the brief's `{spotId, avg, count}`. `lastAt` (max approved-review
  timestamp) is what powers the "recently reviewed" sort; it's tiny and honest.
- **Report min-compose time is 1500ms** (reviews use 3000ms). Filing a report is
  a chip tap plus maybe a sentence — a lighter interaction, so a lower human-floor.
- **IP_SALT is surfaced, not enforced.** The security review flagged that
  `IP_SALT` silently defaults to an empty salt (weakening per-IP hashing) if
  unset. Rather than throw at startup — which would risk the graceful-degradation
  guarantee — the admin **System** tab now shows "IP salt: Set / Missing — rate
  limits are weak," so Artem catches it before real traffic. (Same `?? ""`
  pattern the reviews endpoint already used.)
- **Coordinate bounds on suggestions are app-layer only** (no DB check
  constraint). Accepted: suggestions are human-reviewed before merge and never
  auto-inserted into the dataset — an out-of-bounds coord is rejected with a
  clean 400 and could at worst become a copy-ready string a human discards.

## Gotchas found (worth remembering)

- **Tailwind v4 / Lightning CSS strips a double-hyphen class used as a descendant
  ancestor.** `.map--far .pin { … }` silently vanished from the compiled CSS
  (while `.pin--selected` survived, because it's a *simple* selector). Renaming
  the container class to single-hyphen `.map-far` fixed it. If a hand-written
  rule ever disappears, check for `--` in an ancestor position.
- **Turbopack `next dev` intermittently 404s nested API route segments.** With
  `/api/reviews/route.ts` present, its children `/api/reviews/recent` and
  `/api/reviews/aggregates` sometimes fail to register in `next dev` and return a
  404 HTML page — while the parent and all other routes work. **This is a dev-only
  Turbopack bug, not a code defect:** the production build (`npm start` / Vercel)
  serves them correctly (verified — `recent` → 503 with no DB, `aggregates` → 200,
  i.e. registered, not 404). Restarting the dev server usually clears it. **When
  preflighting, prefer the deployed URL** — a `dev:local` run can show a false
  `/api/reviews/recent` 404 that the real deployment will not.

## Environmental note (this session)

The dev machine was under extreme memory pressure for the first ~1.5 hours (load
average ~700 on 8 cores, ~6.8 GB of 8 GB swap in use — Docker + another project's
dev servers + Electron apps, none of them this project's). That inflated a normal
~10-second test suite to several minutes and made Turbopack `next dev` flaky.
Mitigations used: single-process / `--no-file-parallelism` test runs with long
timeouts, sequential (never concurrent) heavy commands. A few mid-session "test
failures" were PGlite (WASM) boot-timeouts under momentary contention, confirmed
transient by clean re-runs at lower load. The machine recovered to a normal load
of ~2–4 partway through; all gates were verified green at low load before each
commit.

## Notes for the morning

- **Everything moderatable lives in `/admin`** now: reviews, reports (+ set
  hide/warn overrides), suggestions (accept → copy-ready JSON), a **System** tab
  (db/admin/IP-salt/domain/commit + review/scan/report/suggestion counts), and
  scans. Bookmark it on your phone.
- **`npm run dev:local` seeds demo content** — a couple of reviews per top spot,
  open reports on Clover Grill + Café Beignet, a warn override on Molly's, and a
  Bywater Bakery suggestion — so every tab has something to look at out of the box.
- **Before real traffic:** set `IP_SALT` (the System tab will nag you if it's
  missing). Everything else in the go-live checklist is unchanged — see
  `OVERNIGHT-BRIEF-2.md` and the README **Environment & ops** section.
- **`npm run preflight https://<domain>`** is the go/no-go gate. Run it against
  the *deployed* URL (not `dev:local`) for the truest signal, and print stickers
  only after it says **LAUNCH READY**.
- The 412-spot read-only map, filters, GOTTA GEAUX, and add-a-spot all still
  behave exactly as before — every new feature is additive and degrades to
  nothing when the DB is off.
