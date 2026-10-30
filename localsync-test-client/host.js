// Reverse local-sync test: this Node process is the HOST. It publishes a
// real _drift-sync._tcp mDNS service and streams LocalSyncState frames,
// using REAL resolved JioSaavn https playUrls (not fake example.com ones —
// last time fake urls broke playback on join). Phone is the member: open
// Sync Nearby on the phone and tap "Join" on whatever this advertises as.
const { Bonjour } = require("bonjour-service");
const net = require("net");

const API_BASE = "https://www.jiosaavn.com/api.php?__call=";
const HEADERS = { Accept: "application/json, text/plain, */*", Referer: "https://www.jiosaavn.com/" };

async function api(dir) {
  const res = await fetch(`${API_BASE}${dir}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function resolveRealTrack(query) {
  const search = await api(
    `search.getResults&p=1&q=${encodeURIComponent(query)}&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=5`,
  );
  const first = search.results[0];
  const details = await api(`song.getDetails&cc=in&_marker=0%3F_marker%3D0&_format=json&pids=${first.id}`);
  const song = details[first.id];
  const auth = await api(
    `song.generateAuthToken&url=${encodeURIComponent(song.encrypted_media_url)}&bitrate=160&api_version=4&_format=json&ctx=web6dot0&_marker=0`,
  );
  const playUrl = auth.auth_url.replace("ac.cf.", "aac.");
  return {
    id: song.id,
    playUrl,
    songName: song.song,
    songCover: (song.image || "").replace("150x150", "500x500"),
    artistName: song.primary_artists || song.singers || "Unknown",
    duration: Number(song.duration) || 180,
  };
}

async function main() {
  console.log("[host] resolving real tracks from JioSaavn...");
  const track1 = await resolveRealTrack("tum hi ho arijit singh");
  const track2 = await resolveRealTrack("kesariya arijit singh");
  console.log("[host] track 1:", track1.songName);
  console.log("[host] track 2:", track2.songName);

  let state = {
    queue: [track1, track2],
    current_index: 0,
    is_playing: true,
    position_seconds: 0,
    updated_at: new Date().toISOString(),
  };

  const sockets = new Set();
  const server = net.createServer((socket) => {
    console.log("[host] member connected");
    sockets.add(socket);
    socket.write(`${JSON.stringify(state)}\n`);
    socket.on("close", () => {
      sockets.delete(socket);
      console.log("[host] member disconnected");
    });
    socket.on("error", () => sockets.delete(socket));
  });

  server.listen({ port: 0, host: "0.0.0.0" }, () => {
    const port = server.address().port;
    const bonjour = new Bonjour();
    const name = `node-host-${Math.random().toString(36).slice(2, 6)}`;
    bonjour.publish({ name, type: "drift-sync", protocol: "tcp", port });
    console.log(`[host] published mDNS service "${name}" on port ${port}`);
    console.log("[host] on the phone: Player -> WiFi icon -> Sync Nearby -> tap Join on", name);

    const broadcast = () => {
      const frame = `${JSON.stringify(state)}\n`;
      for (const s of sockets) {
        try {
          s.write(frame);
        } catch {
          sockets.delete(s);
        }
      }
      console.log("[host] broadcast:", { current_index: state.current_index, is_playing: state.is_playing, position_seconds: state.position_seconds });
    };

    let step = 0;
    setInterval(() => {
      step += 1;
      state = { ...state, updated_at: new Date().toISOString() };
      if (step === 1) state = { ...state, position_seconds: 20 };
      else if (step === 2) state = { ...state, is_playing: false };
      else if (step === 3) state = { ...state, is_playing: true, position_seconds: 45 };
      else if (step === 4) state = { ...state, current_index: 1, position_seconds: 0, is_playing: true };
      else step = 0;
      broadcast();
    }, 8000);
  });
}

main().catch((e) => console.error("[host] fatal:", e));
