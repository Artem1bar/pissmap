# 💛 PissMap NOLA

**when you gotta geaux** ⚜

New Orleans hands you a drink for the street, then offers you nowhere to put it. PissMap NOLA is
the fix: an interactive map of **412 field-vetted places to pee** across the whole city — free
public restrooms, buy-a-cheap-coffee spots, and hotel lobbies for the bold — with live
open/closed status, distance sorting, and a panic button. Coverage runs from Bourbon Street to
New Orleans East, the Lakefront, the Lower 9th, and across the river to Algiers.

## Features

- 🗺️ **Dark, fast MapLibre map** of the French Quarter through Uptown, City Park, and the Bywater
  — because this app's prime time is 1 a.m. on Bourbon Street. No API keys anywhere.
- 🟢🟡🟣 **Three categories, deliberately Mardi Gras-colored**: Free & public (green),
  Buy something (gold), Hotel lobby (purple). Justice, faith, power — and now relief.
- ⏰ **Live "open now" engine** in New Orleans time, including bars that close at 4 a.m.
  (overnight-wrap aware), "closes soon" warnings, and per-day hours.
- 🚨 **The GOTTA GEAUX button**: geolocates you, ranks every spot with open-first-then-nearest
  urgency, flies the map there, and hands you Google Maps walking directions. Falls back to the
  map view honestly when location is off — and tells you so.
- 📍 **Distance + walk time** at a determined 80 m/min pace, search, category/open-now/24-7
  filters, and a mobile bottom sheet built for one-handed desperation.
- ♿ Accessibility flags where confirmed, keyboard-focusable everything, and an About modal with
  the unwritten rules (the hotel-lobby walk, the $3 bar toll, the casino gambit).

## The data

Compiled **July 2026** from three sources:

1. **OpenStreetMap** — every restroom tagged `amenity=toilets` in Orleans Parish (fetched via
   Overpass, some checked by mappers as recently as 2026), plus Nominatim-verified venue
   coordinates. Spots whose restroom is mapped on OSM carry an "OSM-mapped" badge.
2. **Local knowledge** — the malls, food halls, 24/7 diners, the casino, and the hotel lobbies
   that every service-industry veteran in the Quarter already knows about.
3. **A 50-agent research fleet** — fifty parallel research agents swept every neighborhood and
   venue category in the city (libraries, groceries, breweries, hotel lobbies, 24-hour diners,
   parks, hospitals…), producing 293 candidates. Each surviving candidate was then
   **adversarially fact-checked by its own verification agent** against live sources — 54 were
   rejected (closed venues, wrong addresses, coin-operated restrooms posing as free, invented
   accessibility claims) and 201 made the map. A follow-up round then salvaged 17 of those
   rejections by applying the verifiers' own corrections (right hours, right names, claims
   removed) and added 12 more spots from targeted research in thin neighborhoods (Central City,
   Holy Cross, the Lower 9th) plus icon checks (the Aquarium lobby is the riverfront's official
   restroom; both ferry terminals genuinely have none until 2027). Every researched spot's
   sources and evidence live in [`data/provenance.json`](data/provenance.json). A third round
   added 50 more: ten walk-in hotel lobbies (Four Seasons to the Windsor Court), the Lafitte
   Greenway beer gardens, late-night legends (Snake & Jake's, F&M, Le Bon Temps Roulé), six NORD
   recreation centers verified against the city's official Summer 2026 schedule, and chain
   dining rooms across the East, Gentilly, and Algiers — while *removing* two library branches
   NOPL's own site currently lists as closed for HVAC failures. The map deletes as carefully as
   it adds.

Honesty policy: hours in New Orleans are a jazz standard — everyone plays them differently.
Spots with best-effort hours carry a `verify` flag and the UI says so out loud. If a spot closed
or changed, edit the matching file in [`lib/spots/`](lib/spots/) and open a PR; the dataset is
typed, tested, and split by area. New coordinates come from
[`scripts/geocode.mjs`](scripts/geocode.mjs) (Nominatim, politely rate-limited).

**Legal note:** public urination is a citable municipal offense in New Orleans, and police do
write those tickets, especially during Carnival. This project exists so you never have to test it.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- [MapLibre GL JS](https://maplibre.org) with CARTO's free dark basemap (keyless)
- Tailwind CSS v4, Fraunces + Geist via `next/font`
- Optional community layer: [Drizzle ORM](https://orm.drizzle.team) over
  [Neon Postgres](https://neon.tech) (HTTP driver) in production, [PGlite](https://pglite.dev)
  in dev + tests — same SQL, no Docker
- Vitest — 133 tests over hours/geo/filters/dataset **and** the review anti-spam, database
  queries (against real PGlite), admin auth, and URL helpers

**The read-only map needs no backend, no database, no env vars, and no secrets** — with nothing
configured it prerenders and works exactly as it always has, and the review UI shows a friendly
"coming soon." The database only ever powers the optional community features, and the map never
depends on it being up.

## Develop

```bash
npm install
npm run dev          # dev server (read-only map + "reviews coming soon")
npm run dev:local    # dev server with an in-memory PGlite store, seeded — reviews + /admin live
npm test             # vitest suite
npm run coverage     # coverage report
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run build        # production build
npm run db:generate  # compile lib/db/schema.ts → SQL migrations (no live DB needed)
npm run db:push      # apply migrations to Neon (needs DATABASE_URL)
npm run preflight [url]  # probe a deployment (health, sitemap, /s redirect, OG, admin) → LAUNCH READY
```

`npm run dev:local` is the fastest way to see the whole app: it spins up an in-memory Postgres,
applies the real migrations, and seeds a handful of reviews and scans. Log into `/admin` with the
secret `devsecret`.

## Community layer

Every spot has **The Bowl** — a live, pump.fun-style review feed: rate the porcelain in golden
droplets and leave a note. Reviews are **anonymous-first** (an optional nickname, no accounts ever)
and **pre-moderated** — nothing is public until a human approves it at `/admin`. The list shows a
💧 score once a spot has ≥3 reviews, and you can sort by nearest, top-rated, or recently reviewed.

Two more loops keep the 412 spots honest as they inevitably drift:

- **Report a problem** — every spot has a "something wrong?" control (closed / wrong-hours /
  no-restroom / other). Reports land in `/admin`, grouped by spot with a reason breakdown.
- **Live overrides** — from the Reports tab a moderator can `hide` a spot (drops it from map, list,
  and GOTTA GEAUX) or `warn` it (an amber banner on the detail card): a same-day patch, no redeploy.
  The dataset stays the source of truth; overrides are a small runtime layer (`GET /api/overrides`,
  cached, degrades to empty on any failure).
- **Suggest a spot** — save a personal pin, then "submit to the public map." Suggestions land in
  `/admin`; accepting one yields a copy-ready dataset entry a human verifies and merges. Runtime
  never edits dataset code.

- **Anti-spam is all server-side**, shared across reviews, reports, and suggestions
  ([`lib/antispam.ts`](lib/antispam.ts)): an off-screen honeypot, a minimum compose time, URL
  rejection, and per-IP rate limits keyed on a salted hash of the IP — never the raw IP. (Reviews
  3/hr·10/day, reports 5/day, suggestions 3/day.)
- **Storage** is Drizzle + Neon in production and PGlite in dev/tests, behind one `getDb()` seam.
  With no `DATABASE_URL`, write endpoints return an honest `503` and reads degrade to empty — the
  map is never blocked.
- **Moderate from your phone** at `/admin`: reviews (approve/reject/retract), reports (resolve/
  dismiss + set overrides), suggestions (accept→JSON/reject), a **System** tab (config + live
  counts), and scans. Gated by a constant-time secret check and an httpOnly cookie.

## Growth kit

- **`/stickers`** — a studio that generates print-ready QR stickers (single 3″ or a sheet of 9)
  for any spot or the whole app. The QR encodes `/s/<spot>`, which logs the scan and redirects to
  the spot's permalink.
- **`/spot/<id>`** — a shareable, statically-generated permalink per spot, each with its own
  title and dark/gold OG share card.
- **`/partners`** + **`/partners/pitch`** — a partner tier (gold `PARTNER` ribbon + deal line on
  the map) and a print-friendly one-pager for venue owners.
- **`/press`** — a press kit with the story and live, computed-from-the-dataset stats.

## Environment & ops

Copy [`.env.example`](.env.example) to `.env.local`. **None of these are required to run the map.**

| Variable | What it unlocks |
| --- | --- |
| `DATABASE_URL` | The community layer — reviews, reports, overrides, suggestions, scans (Neon Postgres). Absent → the map still works; the community UI says "coming soon." |
| `ADMIN_SECRET` | The `/admin` moderation console. Absent → admin is disabled. |
| `IP_SALT` | Salt for hashing submitter IPs (per-IP rate limiting on reviews/reports/suggestions). |
| `NEXT_PUBLIC_SITE_URL` | The public base URL for permalinks, OG images, and QR codes. Falls back to the Vercel URL, then localhost. |

**Is it wired up?** `GET /api/health` returns a secret-free snapshot —
`{ db, adminConfigured, siteUrl, spots, commit }` — and `npm run preflight https://<domain>` runs a
full go/no-go checklist (health, `/api/reviews/recent`, `/s/<id>` redirect, sitemap, robots, an OG
image, the admin login page) and prints **LAUNCH READY** only when every check passes. The `/admin`
**System** tab shows the same config + counts from your phone.

**Ops checklist (once, after provisioning):**

1. Vercel dashboard → **Storage/Integrations → add Neon** (creates `DATABASE_URL`). Then locally:
   `vercel env pull .env.local && npm run db:push`.
2. Set `ADMIN_SECRET` and `IP_SALT` (long random strings) in Vercel, and `NEXT_PUBLIC_SITE_URL`
   once the domain is live.
3. **Buy the domain**, point it at Vercel, set `NEXT_PUBLIC_SITE_URL`, redeploy.
4. Run `npm run preflight https://<domain>` — print stickers from `/stickers` only after it says
   **LAUNCH READY**.
5. Before any paid/bartered partner deal, upgrade Vercel to Pro (Hobby is non-commercial).

The **launch execution kit** — press pitches, the first-50 sticker plan, the partner playbook, and a
social pack — lives in [`docs/launch/`](docs/launch/).

## Deploy

Push the repo and import it on [Vercel](https://vercel.com); with no env vars it deploys the
read-only map with zero configuration. Add `DATABASE_URL` (and friends — see **Environment & ops**
above) to light up reviews and moderation. The spot permalinks prerender statically, while the
review APIs and QR redirect run on demand; the OG images, favicon, apple icon, and PWA manifest are
all generated from code.

## Attribution

Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) (ODbL) ·
basemap © [CARTO](https://carto.com/attributions) · built with MapLibre GL.
Not affiliated with the City of New Orleans, obviously.

## License

[MIT](LICENSE) — take it, fork it, make PissMap Austin. The people need to know where to go.
