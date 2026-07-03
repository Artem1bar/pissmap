import { adminCookie } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

/** POST /api/admin/logout — clears the admin cookie. */
export async function POST(): Promise<Response> {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "set-cookie": adminCookie("", 0),
    },
  });
}
