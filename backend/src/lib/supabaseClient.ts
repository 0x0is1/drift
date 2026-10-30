import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY must be set");
}

/**
 * One client per request, scoped to the caller's own forwarded access
 * token. Still only ever uses the anon key — Postgres RLS evaluates
 * `auth.uid()` off this token, so there is no need for (and this backend
 * never holds) a service_role key.
 */
export function scopedClient(accessToken: string) {
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Unscoped anon client, used only to validate a caller's bearer token via auth.getUser(). */
export const authClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
