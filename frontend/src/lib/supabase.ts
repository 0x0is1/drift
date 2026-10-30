import "react-native-get-random-values";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * `kzuvsgxqanawydghfqqp` is live (shared with fw-srcc, see CLAUDE.md
 * "Backend correction"). The whole app must still run without a backend
 * configured, so this stays null instead of throwing at import time; every
 * consumer below no-ops on null.
 */
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

if (!supabase) {
  console.warn(
    "Supabase not configured (missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY) — backend features disabled, check .env.local",
  );
}

/**
 * Every drift_ table assumes auth.uid() is set. Call once at app boot
 * (see src/app/_layout.tsx) before anything touches drift_* tables.
 */
export async function ensureSession() {
  if (!supabase) return null;

  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;

  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return anon.session;
}
