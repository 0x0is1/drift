import { Elysia } from "elysia";
import { authClient, scopedClient } from "@lib/supabaseClient";
import { UnauthorizedError } from "@lib/errors";

/**
 * Every data route needs the caller's own Supabase JWT (obtained client-side
 * straight from Supabase Auth, forwarded here as a Bearer token) — not a
 * service_role key. `authClient.auth.getUser(token)` validates it; the
 * per-request `scopedClient` then carries that same token so RLS enforces
 * per-user access exactly like a direct client would, just one hop later.
 * Throws rather than setting `set.status` itself — status mapping is
 * centralized in index.ts's onError, so this stays HTTP-status agnostic.
 */
export const authPlugin = new Elysia({ name: "authPlugin" }).derive({ as: "scoped" }, async ({ headers }) => {
  const authHeader = headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) throw new UnauthorizedError("Missing bearer token");
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) throw new UnauthorizedError("Invalid or expired session");
  return { userId: data.user.id, db: scopedClient(token) };
});
