# PissMap NOLA — Sticker Rollout Plan

The first 50 QR-sticker placements, chosen from the live dataset. Strategy:
**always-open anchors first, high-traffic corridors second, every key
neighborhood covered.** Each sticker's QR encodes `https://<domain>/s/<id>`,
which logs a scan and 302-redirects to that spot's page (`/spot/<id>`).

## 🛑 Reprint / print rule (read first)

**Do not print a single sticker until:**
1. The real domain is live and `NEXT_PUBLIC_SITE_URL` is set, AND
2. `npm run preflight https://<your-domain>` prints **LAUNCH READY**.

Until then every QR points at a placeholder URL and the whole run is wasted.
The `/stickers` studio in-app shows the same warning for a reason. Print a
**single test sticker**, scan it with your actual phone, confirm it lands on the
right spot page, *then* do the run of 50.

---

## Tier 1 — the 24/7 anchors (print all of these)

Always open = always useful. These are the backbone of the network. There are
**43 always-open spots** in the dataset (the number shown on `/press`); the
highest-priority ones are below. Before a large run, regenerate the exhaustive
list by opening the map, tapping the **24/7** filter, and exporting the visible
ids — that's the authoritative set.

| Spot | Neighborhood | QR target |
|---|---|---|
| Caesars New Orleans (Casino) | CBD | `/s/caesars-casino` |
| Cleo's Mediterranean Cuisine & Grocery (Canal St) | CBD | `/s/cleos-canal-st` |
| The Ritz-Carlton Lobby | CBD | `/s/ritz-carlton` |
| The Roosevelt (Grand Lobby) | CBD | `/s/roosevelt-grand-lobby` |
| Hilton New Orleans Riverside (Lobby) | CBD | `/s/hilton-riverside-lobby` |
| InterContinental New Orleans Lobby | CBD | `/s/intercontinental-new-orleans-lobby` |
| Four Seasons Hotel (Lobby) | CBD | `/s/four-seasons-lobby` |
| Loews New Orleans (Lobby) | CBD | `/s/loews-new-orleans-lobby` |
| New Orleans Marriott Lobby | CBD | `/s/new-orleans-marriott-lobby` |
| NOPSI Hotel (Grand Lobby) | CBD | `/s/nopsi-hotel-lobby` |
| Q&C Hotel (Lobby) | CBD | `/s/q-and-c-hotel-lobby` |
| Renaissance Pere Marquette (Lobby) | CBD | `/s/renaissance-pere-marquette-lobby` |
| The Eliza Jane Lobby | CBD | `/s/eliza-jane-lobby` |
| The Troubadour (Lobby) | CBD | `/s/troubadour-hotel-lobby` |
| The Windsor Court (Lobby) | CBD | `/s/windsor-court-lobby` |
| Clover Grill | French Quarter | `/s/clover-grill` |
| Déjà Vu Bar & Grill | French Quarter | `/s/deja-vu` |
| Aunt Tiki's | French Quarter | `/s/aunt-tikis-decatur` |
| Hotel Monteleone Lobby | French Quarter | `/s/hotel-monteleone` |
| Royal Sonesta Lobby | French Quarter | `/s/royal-sonesta` |
| Omni Royal Orleans Lobby | French Quarter | `/s/omni-royal-orleans-lobby` |
| Hotel de la Poste – French Quarter Lobby | French Quarter | `/s/hotel-de-la-poste-lobby` |
| Chateau LeMoyne (Holiday Inn) Lobby | French Quarter | `/s/chateau-lemoyne-holiday-inn-lobby` |
| The Barnett Lobby (ex-Ace Hotel) | Warehouse District | `/s/the-barnett` |
| The Higgins Hotel (Curio/Hilton) Lobby | Warehouse District | `/s/higgins-hotel-lobby` |
| The Old No. 77 Hotel (Lobby) | Warehouse District | `/s/old-no-77-lobby` |
| Virgin Hotels New Orleans Lobby | Warehouse District | `/s/virgin-hotels-baronne-st` |
| Hotel Saint Vincent (Lobby) | Lower Garden District | `/s/hotel-saint-vincent-lobby` |
| Igor's Lounge & Gameroom | Lower Garden District | `/s/igors-lounge-st-charles` |
| Quartz Bar | Lower Garden District | `/s/quartz-bar-quisby` |
| The Pontchartrain Hotel (Bayou Bar) | Garden District | `/s/pontchartrain-hotel-bayou-bar` |
| Buffa's Bar & Restaurant | Marigny | `/s/buffas-bar-esplanade` |
| Melba's | St. Roch | `/s/melbas` |
| McDonald's (N Broad St) | Mid-City | `/s/mcdonalds-n-broad-st` |
| McDonald's (2757 Canal St) | Mid-City | `/s/mcdonalds-canal-midcity` |
| Waffle House #2196 | Mid-City | `/s/waffle-house-2500-canal` |
| Le Bon Temps Roulé | Uptown | `/s/le-bon-temps-roule` |
| Ms. Mae's | Uptown | `/s/ms-maes-magazine-st` |
| RaceTrac (Gen. DeGaulle) | Algiers | `/s/racetrac-gen-degaulle` |
| Waffle House #2072 | Algiers | `/s/waffle-house-general-de-gaulle` |
| Waffle House #1911 | Florida Area | `/s/waffle-house-1911` |
| Ochsner Baptist Main Lobby | Broadmoor | `/s/ochsner-baptist-main-lobby` |

## Tier 2 — neighborhood coverage (high-traffic, no 24/7 anchor yet)

One sticker in each of these gets the map into a neighborhood the always-open
list misses. Rounds the first run to 50.

| Spot | Neighborhood | QR target |
|---|---|---|
| Ashé Cultural Arts Center | Central City | `/s/ashe-cultural-arts-center` |
| 1000 Figs | Bayou St. John | `/s/1000-figs-bayou-st-john` |
| Alvar Library | Bywater | `/s/alvar-library` |
| Emporium Arcade Bar | St. Claude | `/s/emporium-arcade-bar-st-claude` |
| Besthoff Sculpture Garden | City Park | `/s/besthoff-sculpture-garden` |
| Abita New Orleans Taproom | Irish Channel | `/s/abita-new-orleans-taproom` |
| Aguasanta | Riverbend | `/s/aguasanta-oak-st` |
| Basin St. Station Visitor Center | Tremé | `/s/basin-st-station` |

Remaining neighborhoods (7th Ward, Algiers Point, Broadmoor, Carrollton,
Esplanade Ridge, Fontainebleau, Freret, Gentilly, Gert Town, Holy Cross,
Lakefront, Lakeview, Lower Ninth Ward, Milan, Pontchartrain Park, Touro, West
End) each have a vetted spot too — expand to them in round two.

---

## Placement etiquette (ask first — always)

You are putting *someone else's* wall to work. Do it with grace.

1. **Ask a human.** Find the manager or owner. Never slap a sticker on private
   property unannounced — that's how the whole thing gets torn down.
2. **The pitch (10 seconds):** "I run a free map of good restrooms around the
   city — you're on it. Mind if I put a little QR sticker by the door so people
   can find you? No cost, might send you a few customers."
3. **Public/city property (libraries, parks, transit):** don't stick anything.
   Hand out cards or rely on organic discovery instead.
4. **Placement spots that work:** near the entrance, by the register, on the
   restroom-corridor wall, community bulletin boards. Eye level, dry surface.
5. **If they say no, say thanks and leave.** A torn-down sticker is worse than
   no sticker.
6. **Partners get priority + a custom sticker** (their deal on it). Sign them
   first (see PARTNER-PLAYBOOK.md), then sticker their venue.

## QR generation

Use the in-app **`/stickers`** studio — search a spot, it renders a print-ready
3″ sticker with the correct `/s/<id>` QR (SVG, crisp at any size) plus the
"When you gotta geaux" wordmark. Or a 3×3 sheet for bulk. It refuses to look
final until the domain is live.
