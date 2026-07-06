# PissMap NOLA — Overnight Brief #2: From Built to Launched

**For:** an autonomous Claude (Opus 4.8) session working unattended.
**Mission:** everything from Brief #1 shipped (see `OVERNIGHT-NOTES.md`). The app is
feature-complete but **not yet live in production** — no Neon, no domain, no env
vars set. Tonight: make going-live verifiable, build the community feedback loop
that keeps 412 spots honest, polish scale UX, and produce the launch execution kit.

Read `AGENTS.md`, `docs/OVERNIGHT-BRIEF.md`, and `docs/OVERNIGHT-NOTES.md` first.
Then skim `lib/db/`, `lib/reviews/`, `app/api/`, `components/reviews/` — extend
those patterns; do not invent parallel ones.

## Audit state (verified 2026-07-05 by the reviewing session)

- 134/134 tests green (~13s), typecheck/lint/build clean, 424 static pages.
- e2e on `npm run dev:local`: review submit → pending → admin approve all work;
  URL sync works; map unchanged at 412 pins.
- Fixed since Brief #1: shared PGlite per test worker (was booting per test and
  timing out cold machines). Keep this pattern for any new DB tests.
- Still pending on Artem (blocks production, not your work): Neon integration,
  `ADMIN_SECRET`/`IP_SALT`/`NEXT_PUBLIC_SITE_URL`, domain, `db:push`.

## Iron rules (unchanged, non-negotiable)

1. Before EVERY commit: `npm run typecheck && npm run lint && npm test && npm run
   build` — all green. Commit per phase, push after each stable phase.
2. The static 412-spot map must keep working with zero env vars. Every new
   network feature degrades silently or with friendly copy — never a broken page.
3. No secrets in the repo. New env vars go in `.env.example` with comments.
4. Match house style and file-size norms; reuse the existing anti-spam, cookie-auth,
   and `resolveDb()` seams rather than duplicating them.
5. Verify each UI phase in the preview browser (`pissmap-local` config) on desktop
   AND mobile widths; console must stay clean.
6. Deviations → document in `docs/OVERNIGHT-NOTES-2.md` and keep moving.

## Phase 1 — Launch runway (make going-live verifiable)

The morning problem: Artem will click Vercel buttons half-awake. Give him proof.

- `GET /api/health` → `{ok, db: "connected"|"unconfigured"|"error", adminConfigured:
  bool, siteUrl, spots: 412, commit: <short sha at build time>}`. Never leaks
  secrets; `no-store`.
- `npm run preflight [url]` — script (`scripts/preflight.mjs`) that checks a
  deployment: health db=connected, `/api/reviews/recent` 200, `/s/<real-id>`
  302 → `/spot/<id>`, `/sitemap.xml` 200, `/robots.txt` 200, one OG image 200,
  admin login page 200. Prints ✅/❌ per check + a final LAUNCH READY verdict.
  Defaults to `http://localhost:3000`.
- Admin **System tab**: config status (db/admin/siteUrl), review counts by
  status, scans total + last-7-days, suggestions/reports counts (after Phase 2/3).
- SEO base: `app/sitemap.ts` (all 412 permalinks + core pages), `app/robots.ts`
  (allow all; disallow `/admin`, `/api`), JSON-LD `Place` (name, geo, address,
  `openingHours` where weekly) injected in `/spot/[id]`, canonical URLs via
  `NEXT_PUBLIC_SITE_URL`.

## Phase 2 — Community data-repair loop (the freshness moat)

412 spots WILL rot. Tourists are the sensors; Artem is the actuator.

- **Report a problem** on every spot detail (own component next to The Bowl):
  reason chips — `closed` / `wrong-hours` / `no-restroom` / `other` — plus
  optional detail ≤200 chars. POSTs to new `reports` table (spot_id, reason,
  detail, ip_hash, created_at, status open|resolved|dismissed). Reuse the full
  anti-spam stack (honeypot, min-time, URL block, per-IP limits — stricter:
  5/day). Degrades to hidden when DB off.
- **Admin Reports tab**: grouped by spot with counts, newest first; actions per
  spot: dismiss all / resolve; and the escalation below.
- **Live spot overrides** — same-day corrections without a deploy:
  `overrides` table (spot_id pk, kind `hide`|`warn`, note ≤140, updated_at).
  Client fetches `GET /api/overrides` once on load (s-maxage=300; on failure →
  empty). `hide` removes the spot from map/list/GOTTA GEAUX; `warn` shows an
  amber banner on the detail card ("⚠️ Reported closed July 4 — verifying").
  Admin sets/clears from the Reports tab. Cover with tests (merge logic pure in
  `lib/overrides.ts`). The static dataset stays the source of truth; overrides
  are a runtime patch layer, small and temporary by design.

## Phase 3 — Suggest-a-spot pipeline (crowd → curated)

- After a user saves a personal pin (existing Add-Spot flow), offer **"Submit to
  the public map"**; also add a standalone path from the About modal. Posts
  `{name, lat, lng, category, tip, hoursText?, nickname?}` to `suggestions`
  table (status new|accepted|rejected). Anti-spam: same stack, 3/day per IP.
- Admin **Suggestions tab**: card per suggestion with a mini-map link
  (`geo:`/Google link is fine), Accept / Reject. Accept marks status and shows a
  copy-ready JSON block formatted like a dataset entry (reuse an exported
  formatter in `lib/suggestions.ts`) — a human/agent later verifies + adds to
  `lib/spots/` through the normal geocode/verify pipeline. Do NOT auto-edit
  dataset code from runtime.

## Phase 4 — Scale & UX polish at 412+ spots

- **Low-zoom declutter**: below zoom ~12.5, full pins overlap badly downtown.
  Preferred: swap DOM markers for a clustered GeoJSON circle layer at low zoom
  and keep DOM pins at high zoom (and always for the selected spot). If that
  fights the existing marker lifecycle, acceptable fallback: scale pins down to
  8px dots at low zoom via a zoom listener + CSS class. Either way: no jank on
  mobile, GOTTA GEAUX unaffected.
- **Ratings surfaced**: `GET /api/reviews/aggregates` → `[{spotId, avg, count}]`
  for all spots with ≥1 approved review (tiny; s-maxage=300). List rows show
  "💧4.6·12" once count ≥3; detail header already shows it. Add sort control to
  the list header: Nearest (when located) / Top droplets / Recently reviewed.
- **List neighborhood headers**: sticky group headers in default (unsorted)
  mode; flat list when a sort is active.
- **PWA offline (stretch — only if the night has room)**: minimal hand-rolled
  service worker precaching the shell + map style + dataset chunks so the map
  (not tiles) survives dead roaming data; "offline — showing cached map" toast.
  Skip cleanly if it threatens rule 2; note the decision.

## Phase 5 — Launch execution kit (words, not code)

Write into `docs/launch/`, grounding every number in `lib/stats.ts` output:

- `PRESS-PITCH.md` — 150-word core pitch + tailored angles for NOLA.com,
  Gambit, Eater NOLA, WWL/Fox8, Very Local, and a ready-to-post
  r/NewOrleans draft (self-aware tone, leads with the 412-verified-spots +
  legal-relief angle, mentions free/community/no-ads).
- `STICKER-ROLLOUT.md` — first-50 sticker placements chosen from the dataset
  (24/7 anchors, high-traffic corridors, one per neighborhood minimum),
  ask-permission etiquette script, QR-to-spot mapping table, reprint rule
  (only after domain + preflight).
- `PARTNER-PLAYBOOK.md` — outreach script, the offer (free at launch), FAQ
  objections, a simple tracking table, and the "upgrade Vercel to Pro before
  money" reminder.
- `SOCIAL-PACK.md` — 10 captions (launch, GOTTA GEAUX demo, data-honesty
  brag, partner welcome template, Mardi Gras evergreen).

## Phase 6 — Hardening & final QA

- Validation parity on all new endpoints (length caps, spotId existence,
  reason/kind allowlists); admin routes stay `no-store` + constant-time auth.
- Tests: pure logic (overrides merge, suggestion formatter, report validation)
  plus route-level tests against the shared PGlite helper.
- Full regression matrix: no-DB build (everything degrades), dev:local e2e
  (report → admin resolve → override visible on map; suggest → accept JSON),
  mobile + desktop preview sweep, `npm run preflight` against dev:local.
- Update README (health/preflight, reports/suggestions, launch docs pointer),
  `.env.example`, About-modal line for reporting. Write `OVERNIGHT-NOTES-2.md`.

## Non-goals tonight

Accounts, payments, Premium, native apps, image uploads, auto-merging
suggestions into dataset code, editing the 412 curated entries, migrating
hosting, review replies.

## Artem's go-live checklist (unchanged + additions)

1. Vercel → add Neon integration → `vercel env pull .env.local` → `npm run db:push`.
2. Set `ADMIN_SECRET`, `IP_SALT` (long random), later `NEXT_PUBLIC_SITE_URL`.
3. Buy the domain (`gottageaux.com` still unchecked, worth a look) → point at
   Vercel → set `NEXT_PUBLIC_SITE_URL` → redeploy.
4. Run `npm run preflight https://<your-domain>` — print stickers ONLY after
   it says LAUNCH READY.
5. Upgrade Hobby → Pro before the first partner deal (Hobby is non-commercial).
6. Bookmark `/admin` on your phone; moderation + reports + suggestions all
   live there now.

## Execution order

| Phase | Gate before commit |
|---|---|
| 1 runway | preflight passes against dev:local; sitemap has 413+ URLs |
| 2 reports+overrides | e2e: report → resolve → `warn` banner renders; `hide` removes pin |
| 3 suggestions | e2e: submit → accept → copy-ready JSON matches dataset shape |
| 4 scale/UX | 412 pins smooth at low zoom on mobile width; sort works; no-DB still clean |
| 5 launch docs | every stat in docs matches `lib/stats.ts` output |
| 6 hardening | full matrix green; NOTES-2 written; final push |

Each phase leaves `main` shippable. If the night ends early, finish the current
gate, push, stop. Laissez les bons temps rouler. 🚽⚜️
