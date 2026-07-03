import { adminCookie, adminToken, isAdminEnabled, secretMatches } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

/** POST /api/admin/login — body { secret }. Sets the httpOnly admin cookie on match. */
export async function POST(request: Request): Promise<Response> {
  if (!isAdminEnabled()) {
    return json({ ok: false, reason: "admin-disabled" }, 503);
  }

  let secret = "";
  try {
    const body = await request.json();
    secret = typeof body?.secret === "string" ? body.secret : "";
  } catch {
    return json({ ok: false, error: "Malformed request." }, 400);
  }

  if (!secretMatches(secret)) {
    return json({ ok: false, error: "That's not the secret." }, 401);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "set-cookie": adminCookie(adminToken()!),
    },
  });
}

function json(data: unknown, status: number): Response {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}
