import { jsonResponse } from "../reviews/http";
import { isAdminEnabled, requestAuthorized } from "./auth";

// Shared gate for every admin API: 503 when moderation is switched off, 401
// without a valid cookie. Returns null when the request may proceed.
export function guardAdmin(request: Request): Response | null {
  if (!isAdminEnabled()) {
    return jsonResponse({ ok: false, reason: "admin-disabled" }, { status: 503, cache: "no-store" });
  }
  if (!requestAuthorized(request)) {
    return jsonResponse({ ok: false, error: "Unauthorized." }, { status: 401, cache: "no-store" });
  }
  return null;
}
