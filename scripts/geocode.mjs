// Geocode dataset candidates through Nominatim, respecting the usage policy
// (1 request/second, descriptive User-Agent). Used when expanding lib/spots/.
//
// Usage: node scripts/geocode.mjs <input.json> <output.json>
// Input: JSON array of objects with at least { id, name, address }.
// Output: same objects with { lat, lng, geocodeDisplay, geocodeStatus } added.
//   geocodeStatus: "address" | "name" | "failed"

import fs from "node:fs";

const UA = "pissmap-nola-data/0.2 (dataset build; https://github.com/Artem1bar/pissmap)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error("Usage: node scripts/geocode.mjs <input.json> <output.json>");
  process.exit(1);
}

const entries = JSON.parse(fs.readFileSync(inputPath, "utf8"));

async function query(q) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=1&countrycodes=us`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json[0] ?? null;
}

const out = [];
let done = 0;
for (const entry of entries) {
  let hit = null;
  let status = "failed";
  try {
    hit = await query(`${entry.address}, New Orleans, LA`);
    if (hit) status = "address";
    if (!hit) {
      await sleep(1100);
      hit = await query(`${entry.name}, New Orleans, LA`);
      if (hit) status = "name";
    }
  } catch (error) {
    console.error(`  error for ${entry.id}: ${error.message}`);
  }
  out.push({
    ...entry,
    lat: hit ? +(+hit.lat).toFixed(5) : null,
    lng: hit ? +(+hit.lon).toFixed(5) : null,
    geocodeDisplay: hit ? hit.display_name : null,
    geocodeStatus: status,
  });
  done += 1;
  console.log(
    `${String(done).padStart(3)}/${entries.length} ${entry.id} → ${
      hit ? `${(+hit.lat).toFixed(5)},${(+hit.lon).toFixed(5)} (${status})` : "FAILED"
    }`,
  );
  await sleep(1100);
}

fs.writeFileSync(outputPath, JSON.stringify(out, null, 2));
const failed = out.filter((e) => e.geocodeStatus === "failed");
console.log(`\nDone: ${out.length - failed.length} geocoded, ${failed.length} failed.`);
if (failed.length) console.log("Failed ids:", failed.map((e) => e.id).join(", "));
