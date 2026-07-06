import { isAdminEnabled } from "@/lib/admin/auth";
import { dbStatus } from "@/lib/db/status";
import { siteUrl } from "@/lib/site";
import { SPOTS } from "@/lib/spots";

// A public, secret-free readiness probe. `npm run preflight` and Artem's
// half-awake morning both hit this: it says whether the database answers,
// whether moderation is switched on, what base URL is configured, and which
// commit is live — never anything sensitive. Always uncached.
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const db = await dbStatus();
  return Response.json(
    {
      ok: true,
      db,
      adminConfigured: isAdminEnabled(),
      siteUrl: siteUrl(),
      spots: SPOTS.length,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
