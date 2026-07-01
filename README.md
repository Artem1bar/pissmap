# 💛 PissMap NOLA

**when you gotta geaux** ⚜

New Orleans hands you a drink for the street, then offers you nowhere to put it. PissMap NOLA is
the fix: an interactive map of **34 field-vetted places to pee** across the city — free public
restrooms, buy-a-cheap-coffee spots, and hotel lobbies for the bold — with live open/closed
status, distance sorting, and a panic button.

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

Compiled **July 2026** from two sources:

1. **OpenStreetMap** — every restroom tagged `amenity=toilets` in Orleans Parish (fetched via
   Overpass, some checked by mappers as recently as 2026), plus Nominatim-verified venue
   coordinates. Spots whose restroom is mapped on OSM carry an "OSM-mapped" badge.
2. **Local knowledge** — the malls, food halls, 24/7 diners, the casino, and the hotel lobbies
   that every service-industry veteran in the Quarter already knows about.

Honesty policy: hours in New Orleans are a jazz standard — everyone plays them differently.
Spots with best-effort hours carry a `verify` flag and the UI says so out loud. If a spot closed
or changed, edit [`lib/spots.ts`](lib/spots.ts) and open a PR; the dataset is a single typed,
tested file.

**Legal note:** public urination is a citable municipal offense in New Orleans, and police do
write those tickets, especially during Carnival. This project exists so you never have to test it.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript, fully static output
- [MapLibre GL JS](https://maplibre.org) with CARTO's free dark basemap (keyless)
- Tailwind CSS v4, Fraunces + Geist via `next/font`
- Vitest — 40 tests over the hours/geo/filter/dataset logic (~98% statement coverage of `lib/`)

No backend, no database, no environment variables, no secrets. The whole thing prerenders.

## Develop

```bash
npm install
npm run dev        # dev server
npm test           # vitest suite
npm run coverage   # coverage report
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm run build      # production build (fully static)
```

## Deploy

It's a static Next.js app — `npm run build` and host anywhere. On [Vercel](https://vercel.com):
push the repo and import it; zero configuration needed. The OG image, favicon, apple icon, and
PWA manifest are all generated from code.

## Attribution

Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) (ODbL) ·
basemap © [CARTO](https://carto.com/attributions) · built with MapLibre GL.
Not affiliated with the City of New Orleans, obviously.

## License

[MIT](LICENSE) — take it, fork it, make PissMap Austin. The people need to know where to go.
