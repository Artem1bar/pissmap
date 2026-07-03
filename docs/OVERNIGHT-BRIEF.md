# PissMap NOLA — Overnight Build Brief

**For:** an autonomous Claude (Opus 4.8) session working unattended.
**Mission:** turn the static 412-spot map into a community app — reviews, permalinks,
QR sticker machinery, partner tier, press kit — without ever breaking the map that
already works.

Read this whole file before writing code. Read `README.md` and skim `lib/` and
`components/` to absorb existing conventions. Match them.

---

## 1. Context you must respect

- **The app today**: Next.js 16 App Router, React 19, Tailwind v4, MapLibre, fully
  static, zero backend, zero env vars. 412 curated spots in `lib/spots/*.ts`
  (typed, tested, provenance in `data/provenance.json`). Users can add private
  spots via localStorage (`lib/userSpots.ts`). 51 vitest tests. Deployed on Vercel
  Hobby from `main` on github.com/Artem1bar/pissmap.
- **Product decisions already made with Artem (do not relitigate):**
  - Reviews are **anonymous-first**: optional nickname, no accounts, ever (tonight).
  - **Pre-moderation**: reviews are `pending` until approved in an admin page.
  - **Rating = 1–5 golden droplets.**
  - **Reviews UI = pump.fun / Polymarket chat aesthetic**: a live-feed chat window,
    compact bubbles, hash-colored nicknames, relative timestamps, new-message
    animation. Not a boring review grid.
  - **Database = Postgres on Neon** (Vercel Marketplace integration) via
    `DATABASE_URL`. Artem provisions it — you will NOT have the env var tonight.
  - **Domain is not purchased yet.** Everything URL-ish goes through
    `NEXT_PUBLIC_SITE_URL` with a sane fallback.
  - App stays free for users; bars are the future customers (partner tier).
- **Hosting reality**: Vercel Hobby (non-commercial, 1M invocations, 4 CPU-hrs/mo).
  Backend must be lightweight. No cron-dependent features. When money ever flows,
  Artem upgrades to Pro — not your concern tonight.

## 2. Iron rules

1. **Never commit a broken build.** Before EVERY commit: `npm run typecheck && npm
   run lint && npm test && npm run build` — all green. No exceptions.
2. **Graceful degradation is sacred.** With no `DATABASE_URL`, the app must build,
   deploy, and work exactly as it does today (map + spots + user pins), with
   review UI hidden or in a friendly "coming soon" state. The read-only map must
   never depend on the database being up.
3. **No secrets in the repo.** `.env.local` is gitignored; ship `.env.example`.
4. **Don't touch the dataset** except where this brief says (partner field).
   Don't rewrite existing components beyond what integration requires.
5. **Commit per phase** with conventional messages; push after each stable phase.
6. **Match the house style**: file sizes ≤ ~400 lines, immutable patterns, typed
   exports, witty-but-informative copy in the app's existing voice.
7. **Verify in the preview browser** (`.claude/launch.json` → `pissmap-dev`) after
   each UI phase: desktop + mobile viewport, console clean.
8. If something in this brief turns out to be impossible or wrong, write the
   reason in `docs/OVERNIGHT-NOTES.md`, pick the closest sane alternative, and
   keep moving. Do not stall.

## 3. Architecture for tonight

### Storage layer (Phase 1)
- **Drizzle ORM** with two drivers behind one interface:
  - Production: `@neondatabase/serverless` (HTTP driver) when `DATABASE_URL` set.
  - Dev/tests: **PGlite** (`@electric-sql/pglite`) — same SQL, in-process, no
    Docker, works in vitest. If PGlite+vitest proves flaky after a genuine
    attempt, fall back to a hand-rolled in-memory store implementing the same
    `ReviewStore` interface, and test the SQL schema by compiling migrations only.
- Schema (drizzle, `lib/db/schema.ts`):
  ```
  reviews:  id uuid pk default random, spot_id text not null, rating int not null
            (1..5 check), body text not null (<=280), nickname text (<=24) null,
            status text not null default 'pending'  -- pending|approved|rejected
            ip_hash text not null, created_at timestamptz default now()
  scans:    id serial pk, slug text not null, created_at timestamptz default now()
  ```
  Index: `reviews(spot_id, status, created_at desc)`, `scans(slug)`.
- Migrations via `drizzle-kit`; add scripts: `db:generate`, `db:push` (Artem runs
  `db:push` once after provisioning Neon — put this in the ops checklist).
- `lib/db/index.ts` exports `getDb()` returning null when unconfigured; API
  routes answer `503 {reason:"reviews-not-configured"}` in that case.

### Reviews API (Phase 2)
- `POST /api/reviews` — body `{spotId, rating, body, nickname?, website, t}`.
  Validation: spotId exists in dataset (import SPOTS), rating int 1–5, body
  1–280 chars after trim, nickname ≤24 chars.
  Anti-spam (all server-side):
  - `website` is a **honeypot** — if non-empty, return `{ok:true}` and store nothing.
  - `t` = ms the composer was open; reject < 3000 with a cheeky 429.
  - Reject bodies containing URLs (`https?://`, `www.`) — link spam ends here.
  - **Rate limit via the DB**: hash IP with `IP_SALT` env (sha256, first 16 hex);
    max 3 reviews/hour and 10/day per ip_hash → 429. (IP from
    `x-forwarded-for` first value; if absent use "unknown".)
  - Store status `pending`. Response tells the truth: `{ok:true, status:"pending"}`.
- `GET /api/reviews?spotId=` — approved only, newest first, limit 50. Include
  `{avg, count}` aggregate. Cache: `s-maxage=30, stale-while-revalidate=120`.
- `GET /api/reviews/recent` — last 30 approved across all spots (for the live
  ticker), same caching.
- Unit-test the validation + rate-limit + honeypot logic against the dev store.

### Reviews UI (Phase 3) — the pump.fun window
- In `SpotDetail`, below the tip: **"The Bowl"** (chat window, pick a better name
  if inspiration strikes — it should feel alive):
  - Scrollable feed, newest at bottom, auto-scrolled; compact bubbles: nickname
    chip (deterministic color from nickname hash; "anon-🐊", "anon-⚜️" style
    fallbacks for blank nicknames), 1–5 golden droplets inline, body, relative
    time ("2m", "3h", "2d").
  - Header: average droplets (big) + review count, e.g. "💧 4.2 · 37 reviews".
  - Composer pinned at bottom: droplet selector (tap to set 1–5, gold fill),
    text input w/ 280 counter, nickname field (persisted to localStorage),
    honeypot input (visually hidden, `autocomplete=off`), submit.
  - After submit: optimistic bubble in a "pending" style + note "Reviews are
    moderated — yours goes live after a human glances at it."
  - When API 503s (no DB configured): hide composer + feed, show one quiet line:
    "Reviews are brewing — coming soon."
- **Live ticker**: in the list header area (desktop sidebar top / mobile sheet),
  a one-line marquee-ish rotating feed of recent reviews ("💧💧💧💧 'lifesaver at
  1am' — Erin Rose"), click → selects that spot. Poll `/api/reviews/recent`
  every 60s; render nothing when empty or 503.
- Droplet score also appears in `SpotDetail` header; list rows stay uncluttered
  (skip per-row scores tonight).
- All fetches client-side with graceful failure (never block map interactivity).

### Moderation admin (Phase 4)
- `/admin` — phone-friendly. Auth: form posts `ADMIN_SECRET`, set as httpOnly
  cookie; every admin API checks it (constant-time compare). No secret configured
  → page says admin is disabled.
- Pending queue: cards with spot name, rating, body, nickname, time, ip_hash
  prefix; **Approve / Reject** buttons (big, thumb-sized). Show counts. Also a
  tab for recently-approved with a Reject (retract) button for regrets.
- `GET/POST /api/admin/*` route handlers; never cached.

### Permalinks + QR plumbing (Phase 5)
- `/spot/[id]` — `generateStaticParams` over all 412 spots (stays static!);
  renders `<AppShell initialSpotId>`; per-spot `generateMetadata` (title
  "Erin Rose — PissMap NOLA", description from tip) + per-spot OG image route
  reusing the existing dark/gold OG style with spot name, category color,
  neighborhood.
- `AppShell`: accept `initialSpotId`, select it on mount (fly to it); keep the
  URL in sync on selection via `history.replaceState` (`/spot/<id>` ↔ `/`).
  Back/forward should behave (popstate listener).
- `/s/[id]` — route handler: if DB configured, `insert into scans`; 302 →
  `/spot/[id]`. This is what QR codes encode. Zero DB = plain redirect.
- Scan counts surface in `/admin` (tiny table: slug, total, last 7 days).

### Growth kit (Phase 6)
- **Sticker generator** `/stickers`: choose a spot (search box) or "generic
  app sticker"; renders a print-ready sticker — logo droplet, "When you gotta
  geaux", QR (use `qrcode` npm package, SVG output) encoding
  `${NEXT_PUBLIC_SITE_URL}/s/<id>` (fallback URL: the Vercel prod URL). Sizes:
  3"×3" single + a 3×3 grid sheet view. `@media print` styles; "Print" button.
  Add a visible warning on the page: "Don't print until the real domain is live."
- **Partner tier**: add optional `partner?: { deal: string }` to `Spot` type.
  Detail card: gold "PARTNER" ribbon + deal line ("Show this app for $1 off").
  `/partners` page: lists partner spots (empty-state copy selling the idea) +
  link to `/partners/pitch` — a print-friendly one-pager for bar owners: what
  PissMap is, the 412-spot story, what partners get (pin badge, deal line,
  their own QR sticker), what it costs (launch special: free), contact via
  GitHub repo. No payments, no promises of traffic numbers.
- **Press kit** `/press`: the story (built from the README's data-honesty
  angle), live stats computed from the dataset (spot count, neighborhoods,
  24/7 count, % adversarially verified), the legal-pee angle, logo download
  (link the SVG), contact = GitHub issues link. Keep it one screen, printable.
- **Analytics**: add `@vercel/analytics` `<Analytics/>` in layout (free tier).

### Docs & polish (Phase 7)
- `.env.example` with `DATABASE_URL`, `ADMIN_SECRET`, `IP_SALT`,
  `NEXT_PUBLIC_SITE_URL` + comments.
- README: new "Community reviews" + "Growth kit" sections, env setup, the
  ops checklist below.
- `docs/OVERNIGHT-NOTES.md`: anything you changed vs this brief, and why.
- Update About modal: one line about reviews + moderation + content policy
  (no doxxing, no hate, no fake spots; takedown via GitHub issues).
- Full preview QA: mobile + desktop; flows: submit review (mock/pending),
  admin approve (with a local PGlite dev server if feasible), permalink load,
  OG check, sticker print view, 412-spot map still instant, console clean.
- Tests: aim to keep/lift coverage on all new `lib/` code (validation,
  rate-limit math, store adapters, slug/url helpers).

## 4. Explicit non-goals tonight

Accounts, payments, PissMap Premium, push notifications, native apps, review
replies/threads, image uploads (spicy moderation surface — do not build),
migrating off Vercel, editing the 412 curated spots.

## 5. Ops checklist for Artem (the human, in the morning)

1. Vercel dashboard → Storage/Integrations → add **Neon** to the project
   (creates `DATABASE_URL` automatically). Then locally: `vercel env pull
   .env.local && npm run db:push` (one time).
2. Set env vars in Vercel: `ADMIN_SECRET` (long random), `IP_SALT` (long
   random), `NEXT_PUBLIC_SITE_URL` (after domain).
3. **Buy the domain.** Candidates to check: `pissmap.com/.app/.xyz`,
   `pissmapnola.com`, `gottageaux.com`, `whenyougottageaux.com`. Point it at
   Vercel, set `NEXT_PUBLIC_SITE_URL`, redeploy.
4. Only after the domain is live: print stickers from `/stickers`.
5. Before the first paid/bartered partner deal: upgrade Vercel to Pro
   (Hobby is non-commercial).
6. Moderate from your phone at `/admin` (bookmark it, keep the secret in a
   password manager).

## 6. Suggested execution order & time budget

| Phase | What | Gate before commit |
|---|---|---|
| 1 | deps, env plumbing, schema, store adapters, tests | build green w/ and w/o `DATABASE_URL` |
| 2 | reviews API + anti-spam + tests | unit tests for every rejection path |
| 3 | chat-window UI + ticker + composer | preview QA both states (503 + live w/ dev store) |
| 4 | /admin moderation | approve/reject round-trip against dev store |
| 5 | /spot/[id] + /s/[id] + OG + URL sync | 412 static params build; share-card renders |
| 6 | stickers + partners + press + analytics | print view sane; QR scannable from screen |
| 7 | docs, About, README, final QA sweep | full suite + fresh `next build` + push |

Work the phases in order — each leaves `main` shippable. If the night ends
mid-phase, finish the current gate, push, and write up the stopping point in
`docs/OVERNIGHT-NOTES.md`.

Laissez les bons temps rouler. 🚽⚜️
