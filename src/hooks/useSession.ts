import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@lib/supabase";

/**
 * Auth is optional by design (see CLAUDE.md "Auth"): the app always has a
 * Supabase session (anonymous from first launch, per ensureSession in
 * src/app/_layout.tsx), but personalized features (profile identity, saved
 * data, recommendations) only light up once that session has a real email
 * attached. isAnonymous is the gate every such feature should check.
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(() => !!supabase);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const isAnonymous = session?.user?.is_anonymous ?? true;
  return { session, isAnonymous, email: session?.user?.email ?? null, loading };
}
