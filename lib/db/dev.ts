import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";
import { overrides, reports, reviews, scans, suggestions } from "./schema";
import type { Db } from "./index";

// A local, in-memory Postgres for dogfooding reviews + moderation without Neon.
// Reached ONLY via resolveDb() in development when PISSMAP_LOCAL_DB=1 — a branch
// the production build dead-code-eliminates, so this file (and PGlite) never
// ship. Data lives for the lifetime of the `next dev` process; every restart
// re-seeds a known, demoable state.

let booting: Promise<Db> | null = null;

export function getDevDb(): Promise<Db> {
  booting ??= boot();
  return booting;
}

async function boot(): Promise<Db> {
  // Keep the PGlite-typed handle for migrate(); cast to Db only for our own
  // query helpers, which use the shared query-builder surface.
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: "./lib/db/migrations" });
  await seed(db as unknown as Db);
  return db as unknown as Db;
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

interface SeedReview {
  spotId: string;
  rating: number;
  body: string;
  nickname: string | null;
  status: "approved" | "pending";
  ago: number;
}

const SEED_REVIEWS: SeedReview[] = [
  { spotId: "clover-grill", rating: 5, body: "Open at 4am when nothing else is. Grill's going, restroom's clean, staff didn't blink at my state.", nickname: "NightOwl", status: "approved", ago: 4 * MIN },
  { spotId: "clover-grill", rating: 4, body: "Buy a coffee, use the bathroom, sober up on a burger. The holy trinity of a Bourbon St exit strategy.", nickname: null, status: "approved", ago: 38 * MIN },
  { spotId: "cafe-beignet-royal", rating: 4, body: "Beignets AND relief. Line moves fast, restroom's tucked in the back past the courtyard.", nickname: "SugarDusted", status: "approved", ago: 2 * HOUR },
  { spotId: "mollys-at-the-market", rating: 5, body: "Go-cup in one hand, dignity restored. Bartenders are angels about it if you're friendly.", nickname: "Decatur Regular", status: "approved", ago: 5 * HOUR },
  { spotId: "caesars-casino", rating: 5, body: "24/7, marble everywhere, nobody asks questions. The move after midnight, exactly like the app says.", nickname: "HighRoller", status: "approved", ago: 9 * HOUR },
  { spotId: "ccs-coffee-royal-st", rating: 3, body: "Fine in a pinch. Code on the receipt some nights, so actually buy the coffee.", nickname: null, status: "approved", ago: 22 * HOUR },
  { spotId: "nopl-main-library", rating: 5, body: "Free, clean, air-conditioned, zero purchase. Public libraries are the unsung heroes of this whole map.", nickname: "TaxpayerFunded", status: "approved", ago: 1 * DAY + 3 * HOUR },
  { spotId: "cafe-envie-decatur", rating: 4, body: "Solid Quarter standby. Cortado's good, the restroom's better than it has any right to be.", nickname: "Envie4Life", status: "approved", ago: 2 * DAY },
  { spotId: "french-market-dutch-alley", rating: 4, body: "Actual public restrooms in the Quarter?? Bless the French Market. Can get busy midday.", nickname: null, status: "approved", ago: 2 * DAY + 6 * HOUR },
  // A couple more so clover-grill and caesars cross the ≥3 threshold that lights
  // up the list-row droplet badges and makes the Top/Recent sorts demoable.
  { spotId: "clover-grill", rating: 5, body: "The 24-hour griddle hero of the Quarter. Bathroom's small but it's THERE at 3am.", nickname: "GriddleGuy", status: "approved", ago: 7 * HOUR },
  { spotId: "clover-grill", rating: 4, body: "Reliable. Order the pancake cooked under a hubcap while you're at it.", nickname: null, status: "approved", ago: 1 * DAY + 8 * HOUR },
  { spotId: "caesars-casino", rating: 4, body: "Marble, mirrors, and blessed air conditioning. Just look like you're headed to the tables.", nickname: "PokerFace", status: "approved", ago: 14 * HOUR },
  { spotId: "caesars-casino", rating: 5, body: "The gold standard for a late-night Quarter emergency. Never closes, never judges.", nickname: null, status: "approved", ago: 1 * DAY + 2 * HOUR },
  // Two pending reviews so the /admin queue has something to moderate.
  { spotId: "clover-grill", rating: 2, body: "Was closed when I went?? Maybe just a bad night but I was in trouble.", nickname: "Skeptical", status: "pending", ago: 12 * MIN },
  { spotId: "caesars-casino", rating: 5, body: "Lifesaver during Carnival. Walked in like I belonged, walked out a new person.", nickname: "MardiGrasSurvivor", status: "pending", ago: 40 * MIN },
];

const SEED_SCANS: Array<{ slug: string; ago: number }> = [
  { slug: "clover-grill", ago: 10 * MIN },
  { slug: "clover-grill", ago: 3 * HOUR },
  { slug: "clover-grill", ago: 2 * DAY },
  { slug: "caesars-casino", ago: 1 * HOUR },
  { slug: "caesars-casino", ago: 9 * DAY },
  { slug: "mollys-at-the-market", ago: 30 * MIN },
];

interface SeedReport {
  spotId: string;
  reason: "closed" | "wrong-hours" | "no-restroom" | "other";
  detail: string | null;
  ago: number;
}

// A few open reports so the /admin Reports tab has something to triage.
const SEED_REPORTS: SeedReport[] = [
  { spotId: "clover-grill", reason: "closed", detail: "Padlocked when I went by around 2am.", ago: 25 * MIN },
  { spotId: "clover-grill", reason: "no-restroom", detail: null, ago: 3 * HOUR },
  { spotId: "cafe-beignet-royal", reason: "wrong-hours", detail: "Closed at 6, app said 10.", ago: 1 * DAY },
];

// One live warn override so the amber detail banner is demoable out of the box.
const SEED_OVERRIDES: Array<{ spotId: string; kind: "hide" | "warn"; note: string | null }> = [
  { spotId: "mollys-at-the-market", kind: "warn", note: "Reported closed for a private event — verifying." },
];

// A pending crowd suggestion so the /admin Suggestions tab has a card to accept.
const SEED_SUGGESTIONS: Array<{
  name: string;
  lat: number;
  lng: number;
  category: "public" | "customers" | "lobby";
  tip: string;
  hoursText: string | null;
  nickname: string | null;
  ago: number;
}> = [
  {
    name: "Bywater Bakery",
    lat: 29.96348,
    lng: -90.0503,
    category: "customers",
    tip: "Neighborhood bakery with a restroom — grab a king cake slice and you're set.",
    hoursText: "7am–3pm most days",
    nickname: "BywaterBecky",
    ago: 6 * HOUR,
  },
];

async function seed(db: Db): Promise<void> {
  const now = Date.now();
  await db.insert(reviews).values(
    SEED_REVIEWS.map((r) => ({
      spotId: r.spotId,
      rating: r.rating,
      body: r.body,
      nickname: r.nickname,
      status: r.status,
      ipHash: "seed",
      createdAt: new Date(now - r.ago),
    })),
  );
  await db.insert(scans).values(
    SEED_SCANS.map((s) => ({ slug: s.slug, createdAt: new Date(now - s.ago) })),
  );
  await db.insert(reports).values(
    SEED_REPORTS.map((r) => ({
      spotId: r.spotId,
      reason: r.reason,
      detail: r.detail,
      ipHash: "seed",
      createdAt: new Date(now - r.ago),
    })),
  );
  await db.insert(overrides).values(SEED_OVERRIDES);
  await db.insert(suggestions).values(
    SEED_SUGGESTIONS.map((s) => ({
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      category: s.category,
      tip: s.tip,
      hoursText: s.hoursText,
      nickname: s.nickname,
      ipHash: "seed",
      createdAt: new Date(now - s.ago),
    })),
  );
}
