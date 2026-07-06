<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# pissmap — project briefing

PissMap NOLA: an interactive dark MapLibre map of 412 vetted places to pee across New Orleans (free/public, buy-something, hotel-lobby) with a live open-now engine, distance/walk-time ranking, and an optional pre-moderated anonymous review layer ("The Bowl", moderated at /admin). The read-only map needs no env vars or DB; `DATABASE_URL` only unlocks reviews/scans (absent → review APIs return 503, UI says "coming soon").

## Commands (npm — package-lock.json)

- `npm run dev` — dev server (read-only map)
- `npm run dev:local` — dev with seeded in-memory PGlite; reviews + /admin live (secret `devsecret`)
- `npm run build` / `npm start` — production build / serve
- `npm run lint` — eslint
- `npm test` — vitest run; `npm run test:watch` — watch mode
- `npm run coverage` — vitest run --coverage (v8, output in coverage/)
- `npm run typecheck` — tsc --noEmit
- `npm run db:generate` — drizzle-kit generate: lib/db/schema.ts → SQL migrations in lib/db/migrations (no live DB)
- `npm run db:push` — drizzle-kit push to Neon (needs `DATABASE_URL`)

## Structure

- `app/` — App Router: main page, admin/, api/, partners/, press/, s/ (QR scan redirect), spot/, stickers/; OG images, manifest, icons generated from code
- `components/` — React UI (MapView, FilterBar, SpotDetail, EmergencyButton, …) plus growth/, reviews/, hooks
- `lib/` — domain logic: hours, geo, filters, stats, links, site, userSpots; dataset in lib/spots/; DB layer in lib/db/ (schema.ts, queries.ts, migrations/); reviews/, admin/; tests in lib/__tests__/
- `data/provenance.json` — sources/evidence for researched spots
- `docs/` — OVERNIGHT-BRIEF.md, OVERNIGHT-NOTES.md
- `scripts/geocode.mjs` — Nominatim geocoding helper

## Stack & conventions

- Next.js 16.2.10 (App Router) + React 19.2.4 + TypeScript 5; Tailwind CSS v4 (@tailwindcss/postcss); Fraunces + Geist via next/font
- Map: maplibre-gl 5, keyless CARTO dark basemap; no UI kit — components are hand-rolled
- DB: Drizzle ORM, postgresql dialect (drizzle.config.ts) — @neondatabase/serverless in prod, @electric-sql/pglite in dev/tests, behind one `getDb()` seam
- Tests: Vitest 4, node environment, tests in `lib/**/*.test.ts` + `app/**/*.test.ts`; v8 coverage measured over lib/ only (vitest.config.ts)
- Keep the map working with zero env vars — DB is optional by design
