#!/usr/bin/env node
// Preflight: probe a PissMap deployment and print a go/no-go verdict before
// anyone prints a sticker. Usage:
//   npm run preflight                       # checks http://localhost:3000
//   npm run preflight https://your-domain   # checks a live deployment
//
// Zero dependencies — uses Node's global fetch. Exits 0 only when every check
// passes (LAUNCH READY), non-zero otherwise, so CI or a shell `&&` can gate on it.

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

/** Run one named check; `fn` returns { ok, detail }. Never throws. */
async function check(name, fn) {
  try {
    const { ok, detail } = await fn();
    return { name, ok, detail };
  } catch (err) {
    return { name, ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

async function get(path, init = {}) {
  return fetch(`${base}${path}`, { redirect: "manual", ...init });
}

/** Pull a real /spot/<id> id out of the sitemap so the redirect check uses a live spot. */
async function firstSpotId() {
  try {
    const res = await get("/sitemap.xml");
    const xml = await res.text();
    const match = xml.match(/\/spot\/([^<\s/]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

async function main() {
  console.log(`\n${BOLD}PissMap preflight${RESET} ${DIM}→ ${base}${RESET}\n`);

  const spotId = (await firstSpotId()) ?? "clover-grill";
  const REDIRECT = new Set([301, 302, 307, 308]);

  const checks = [
    check("health · db connected", async () => {
      const res = await get("/api/health");
      const data = await res.json().catch(() => ({}));
      return {
        ok: res.status === 200 && data.db === "connected",
        detail: `db=${data.db ?? "?"} spots=${data.spots ?? "?"} commit=${data.commit ?? "?"}`,
      };
    }),
    check("GET /api/reviews/recent", async () => {
      const res = await get("/api/reviews/recent");
      return { ok: res.status === 200, detail: `status ${res.status}` };
    }),
    check(`GET /s/${spotId} → /spot/${spotId}`, async () => {
      const res = await get(`/s/${encodeURIComponent(spotId)}`);
      const loc = res.headers.get("location") ?? "";
      return {
        ok: REDIRECT.has(res.status) && loc.includes(`/spot/${spotId}`),
        detail: `status ${res.status} → ${loc || "(no location)"}`,
      };
    }),
    check("GET /sitemap.xml", async () => {
      const res = await get("/sitemap.xml");
      const body = await res.text();
      const urls = (body.match(/<url>/g) ?? []).length;
      return { ok: res.status === 200 && urls >= 413, detail: `${urls} URLs` };
    }),
    check("GET /robots.txt", async () => {
      const res = await get("/robots.txt");
      const body = await res.text();
      return {
        ok: res.status === 200 && /Sitemap:/i.test(body),
        detail: `status ${res.status}`,
      };
    }),
    check("OG image renders", async () => {
      const res = await get("/opengraph-image");
      const type = res.headers.get("content-type") ?? "";
      return { ok: res.status === 200 && type.startsWith("image/"), detail: type || `status ${res.status}` };
    }),
    check("GET /admin (login page)", async () => {
      const res = await get("/admin");
      return { ok: res.status === 200, detail: `status ${res.status}` };
    }),
  ];

  const results = await Promise.all(checks);
  for (const r of results) {
    const mark = r.ok ? `${GREEN}✅${RESET}` : `${RED}❌${RESET}`;
    console.log(`  ${mark}  ${r.name}  ${DIM}${r.detail}${RESET}`);
  }

  const passed = results.filter((r) => r.ok).length;
  const allGood = passed === results.length;
  console.log(
    `\n  ${allGood ? GREEN + BOLD + "🚀 LAUNCH READY" : RED + BOLD + "🛑 NOT READY"}${RESET}` +
      ` ${DIM}(${passed}/${results.length} checks passed)${RESET}\n`,
  );
  process.exit(allGood ? 0 : 1);
}

main().catch((err) => {
  console.error(`${RED}preflight crashed:${RESET}`, err);
  process.exit(1);
});
