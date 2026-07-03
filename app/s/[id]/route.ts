import { resolveDb } from "@/lib/db";
import { insertScan } from "@/lib/db/queries";
import { spotPath } from "@/lib/site";
import { isKnownSpotId } from "@/lib/spots";

// The short link a QR sticker encodes: record the scan (best-effort) and 302 to
// the spot's permalink. With no database it's a plain redirect — the sticker
// still works. Never let a logging failure block the redirect.
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;

  if (isKnownSpotId(id)) {
    try {
      const db = await resolveDb();
      if (db) await insertScan(db, id);
    } catch {
      // Scan logging is best-effort; the redirect matters more.
    }
  }

  return Response.redirect(new URL(spotPath(id), request.url), 302);
}
