// Standalone Node test client for drift_sessions ("Listen Together") sync —
// simulates a second client against the real Supabase backend without a
// second device/emulator. Two modes:
//   node scripts/sync-test-client.js host              — create a session, act as host, mutate state every few seconds
//   node scripts/sync-test-client.js join <session-id>  — join an existing session as a member, log every realtime frame
//
// Reads EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY from .env.local.
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const text = fs.readFileSync(envPath, "utf8");
  const vars = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) vars[m[1]] = m[2].trim();
  }
  return vars;
}

const env = loadEnvLocal();
const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

// Real, resolved JioSaavn tracks — a fake example.com queue previously broke
// the joining phone's playback (applyRemoteState pushes the queue straight
// into TrackPlayer and calls play() with no reachability check).
const JIOSAAVN_API = "https://www.jiosaavn.com/api.php?__call=";
const JIOSAAVN_HEADERS = { Accept: "application/json, text/plain, */*", Referer: "https://www.jiosaavn.com/" };

async function jiosaavnApi(dir) {
  const res = await fetch(`${JIOSAAVN_API}${dir}`, { headers: JIOSAAVN_HEADERS });
  if (!res.ok) throw new Error(`JioSaavn API ${res.status}`);
  return res.json();
}

async function resolveRealTrack(query) {
  const search = await jiosaavnApi(
    `search.getResults&p=1&q=${encodeURIComponent(query)}&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=5`,
  );
  const first = search.results[0];
  const details = await jiosaavnApi(`song.getDetails&cc=in&_marker=0%3F_marker%3D0&_format=json&pids=${first.id}`);
  const song = details[first.id];
  const auth = await jiosaavnApi(
    `song.generateAuthToken&url=${encodeURIComponent(song.encrypted_media_url)}&bitrate=160&api_version=4&_format=json&ctx=web6dot0&_marker=0`,
  );
  return {
    id: song.id,
    playUrl: auth.auth_url.replace("ac.cf.", "aac."),
    songName: song.song,
    songCover: (song.image || "").replace("150x150", "500x500"),
    artistName: song.primary_artists || song.singers || "Unknown",
    duration: Number(song.duration) || 180,
  };
}

async function signIn() {
  // Anonymous sign-ins are disabled on this project (see login.tsx) — use a
  // disposable throwaway account instead, created fresh each run.
  const email = `drift-sync-test-${Date.now()}@example.com`;
  const password = "sync-test-pw-123456";
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (!data.session) throw new Error("signUp did not return a session — email confirmation likely required on this project");
  console.log("[client] signed up, user_id =", data.user.id);
  return data.user.id;
}

async function runHost() {
  await signIn();
  console.log("[host] resolving real tracks from JioSaavn...");
  const queue = [await resolveRealTrack("tum hi ho arijit singh"), await resolveRealTrack("kesariya arijit singh")];
  console.log("[host] queue:", queue.map((t) => t.songName).join(", "));
  const { data: session, error } = await supabase
    .from("drift_sessions")
    .insert({
      host_user_id: (await supabase.auth.getUser()).data.user.id,
      queue,
      current_index: 0,
      is_playing: true,
      position_seconds: 0,
    })
    .select("*")
    .single();
  if (error) throw error;
  console.log("[host] session created, id =", session.id);
  console.log("[host] on the phone: Player -> Listen Together -> Join -> paste this id");

  supabase
    .channel(`drift_session_members:${session.id}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "drift_session_members", filter: `session_id=eq.${session.id}` },
      (payload) => console.log("[host] member joined:", payload.new),
    )
    .subscribe();

  let step = 0;
  const tick = async () => {
    step += 1;
    const cycle = ((step - 1) % 4) + 1;
    const patch =
      cycle === 1
        ? { current_index: 1, position_seconds: 0, is_playing: true }
        : cycle === 2
          ? { is_playing: false }
          : cycle === 3
            ? { is_playing: true, position_seconds: 45 }
            : { current_index: 0, position_seconds: 0, is_playing: true };
    const { error: updateError } = await supabase
      .from("drift_sessions")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", session.id);
    if (updateError) console.error("[host] update failed:", updateError.message);
    else console.log(`[host] step ${step} pushed:`, patch);
    setTimeout(tick, 8000);
  };
  setTimeout(tick, 8000);
}

async function runJoin(sessionId) {
  if (!sessionId) throw new Error("usage: node scripts/sync-test-client.js join <session-id>");
  await signIn();
  const { error: joinError } = await supabase
    .from("drift_session_members")
    .insert({ session_id: sessionId, user_id: (await supabase.auth.getUser()).data.user.id, display_name: "sim-client" });
  if (joinError) throw joinError;
  console.log("[member] joined session", sessionId);

  const { data: row } = await supabase.from("drift_sessions").select("*").eq("id", sessionId).single();
  console.log("[member] initial state:", row);

  supabase
    .channel(`drift_sessions:${sessionId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "drift_sessions", filter: `id=eq.${sessionId}` },
      (payload) => console.log("[member] remote update received:", payload.new),
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "drift_sessions", filter: `id=eq.${sessionId}` },
      () => console.log("[member] session ended (host left)"),
    )
    .subscribe((status) => console.log("[member] channel status:", status));
}

const [, , mode, arg] = process.argv;
if (mode === "host") runHost().catch((e) => console.error(e));
else if (mode === "join") runJoin(arg).catch((e) => console.error(e));
else console.log("usage: node scripts/sync-test-client.js host | join <session-id>");
