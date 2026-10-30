import Zeroconf from "react-native-zeroconf";
import TcpSockets from "react-native-tcp-socket";
import * as Device from "expo-device";
import type { SyncQueueItem } from "@lib/syncSession";

/**
 * "Sync nearby" (phase 7b): phones on the same WiFi sync play/pause/seek/
 * track-change directly, no internet/Supabase round-trip. Separate feature
 * from Supabase-based "Listen Together" (src/lib/syncSession.ts) — kept
 * side by side per product decision, not a replacement.
 *
 * Transport: mDNS (react-native-zeroconf) for discovery only, a raw TCP
 * socket (react-native-tcp-socket) for the actual state stream. Host runs
 * a TCP server and advertises it over mDNS; members browse, connect, and
 * receive newline-delimited JSON `LocalSyncState` frames. Same shape as
 * `SyncSessionRow` on purpose so PlayerContext's existing apply-remote-state
 * logic can be reused for both transports.
 */
const SERVICE_TYPE = "drift-sync";
const SERVICE_PROTOCOL = "tcp";
const SERVICE_DOMAIN = "local.";

export type LocalSyncState = {
  queue: SyncQueueItem[];
  current_index: number;
  is_playing: boolean;
  position_seconds: number;
  updated_at: string;
};

export type LocalPeer = {
  name: string;
  host: string;
  port: number;
};

function deviceDisplayName(): string {
  const base = Device.deviceName ?? Device.modelName ?? "Drift";
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Host side: serves state to any connected member, advertised over mDNS. */
export class LocalSyncHost {
  private server: ReturnType<typeof TcpSockets.createServer> | null = null;
  private sockets: Set<{ write: (data: string) => void; destroy: () => void }> = new Set();
  private zeroconf = new Zeroconf();
  private name = deviceDisplayName();

  /**
   * `onMemberState` makes this bidirectional: any connected member can push
   * a state change (play/pause/seek/skip on their own device), not just the
   * host. The host applies it locally (same as a member would) and relays
   * it to every other connected socket — the host is a dumb star-topology
   * relay here, not a merge/arbiter; last write wins, same as the Supabase
   * transport's single-row UPDATE semantics.
   */
  async start(initialState: LocalSyncState, onMemberState?: (state: LocalSyncState) => void): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const server = TcpSockets.createServer((socket) => {
        this.sockets.add(socket);
        socket.write(`${JSON.stringify(initialState)}\n`);
        let buffer = "";
        socket.on("data", (chunk: string | { toString(): string }) => {
          buffer += chunk.toString();
          let newlineIndex = buffer.indexOf("\n");
          while (newlineIndex !== -1) {
            const line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            if (line.trim()) {
              try {
                const state = JSON.parse(line) as LocalSyncState;
                onMemberState?.(state);
                this.broadcast(state);
              } catch {
                // malformed frame, skip
              }
            }
            newlineIndex = buffer.indexOf("\n");
          }
        });
        socket.on("close", () => this.sockets.delete(socket));
        socket.on("error", () => this.sockets.delete(socket));
      });
      server.listen({ port: 0, host: "0.0.0.0" }, () => {
        const address = server.address();
        const port = typeof address === "object" && address ? address.port : 0;
        if (!port) {
          reject(new Error("Couldn't open a local port"));
          return;
        }
        this.server = server;
        this.zeroconf.publishService(SERVICE_TYPE, SERVICE_PROTOCOL, SERVICE_DOMAIN, this.name, port);
        resolve();
      });
      server.on("error", (err: Error) => reject(err));
    });
  }

  broadcast(state: LocalSyncState) {
    const frame = `${JSON.stringify(state)}\n`;
    for (const socket of this.sockets) {
      try {
        socket.write(frame);
      } catch {
        this.sockets.delete(socket);
      }
    }
  }

  stop() {
    this.zeroconf.unpublishService(this.name);
    this.zeroconf.stop();
    for (const socket of this.sockets) socket.destroy();
    this.sockets.clear();
    this.server?.close();
    this.server = null;
  }
}

/** Member side: browse for hosts on the same WiFi. */
export function discoverPeers(
  onFound: (peer: LocalPeer) => void,
  onLost: (name: string) => void,
): () => void {
  const zeroconf = new Zeroconf();
  zeroconf.on("resolved", (service) => {
    // service.host is the mDNS hostname (e.g. "Android_xxxx.local") — plain
    // TCP sockets on Android don't resolve .local names, only real DNS/IPs,
    // so connectToPeer needs a literal address or every join silently fails
    // to connect. Prefer the resolved IPv4 literal; service.host is a last
    // resort for environments where it happens to be directly resolvable.
    const address = service.ipv4?.[0] ?? service.addresses?.[0] ?? service.host;
    if (!address || !service.port) return;
    onFound({ name: service.name, host: address, port: service.port });
  });
  zeroconf.on("remove", (name: string) => onLost(name));
  zeroconf.scan(SERVICE_TYPE, SERVICE_PROTOCOL, SERVICE_DOMAIN);
  return () => {
    zeroconf.stop();
    zeroconf.removeDeviceListeners();
  };
}

export type PeerConnection = {
  /** Push a local state change (play/pause/seek/skip) back to the host, which relays it to everyone else. */
  send: (state: LocalSyncState) => void;
  disconnect: () => void;
};

/** Member side: connect to a discovered host and stream state frames both ways. */
export function connectToPeer(
  peer: LocalPeer,
  onState: (state: LocalSyncState) => void,
  onDisconnect: () => void,
): PeerConnection {
  let buffer = "";
  const socket = TcpSockets.createConnection({ host: peer.host, port: peer.port }, () => {
    // connected
  });
  socket.on("data", (chunk: string | { toString(): string }) => {
    buffer += chunk.toString();
    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (line.trim()) {
        try {
          onState(JSON.parse(line) as LocalSyncState);
        } catch {
          // malformed frame, skip
        }
      }
      newlineIndex = buffer.indexOf("\n");
    }
  });
  socket.on("close", onDisconnect);
  socket.on("error", onDisconnect);
  return {
    send: (state) => socket.write(`${JSON.stringify(state)}\n`),
    disconnect: () => socket.destroy(),
  };
}
