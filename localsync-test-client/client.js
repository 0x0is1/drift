// Scratch test client for drift's "Sync Nearby" (WiFi/mDNS/TCP) feature.
// Discovers the phone's advertised _drift-sync._tcp.local service, connects
// over raw TCP, and logs every newline-delimited JSON state frame it streams.
const { Bonjour } = require("bonjour-service");
const net = require("net");

const bonjour = new Bonjour();
console.log("[client] browsing for _drift-sync._tcp.local ...");

const browser = bonjour.find({ type: "drift-sync", protocol: "tcp" }, (service) => {
  console.log("[client] found service:", {
    name: service.name,
    host: service.host,
    addresses: service.addresses,
    port: service.port,
  });

  const address = (service.addresses || []).find((a) => a.includes(".")) || service.host;
  console.log(`[client] connecting to ${address}:${service.port} ...`);

  const socket = net.createConnection({ host: address, port: service.port }, () => {
    console.log("[client] TCP connected");
  });

  let buffer = "";
  socket.on("data", (chunk) => {
    buffer += chunk.toString();
    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (line.trim()) {
        try {
          console.log("[client] frame:", JSON.parse(line));
        } catch {
          console.log("[client] malformed frame:", line);
        }
      }
      newlineIndex = buffer.indexOf("\n");
    }
  });
  socket.on("close", () => console.log("[client] socket closed"));
  socket.on("error", (err) => console.log("[client] socket error:", err.message));
});

process.on("SIGINT", () => {
  browser.stop();
  bonjour.destroy();
  process.exit(0);
});
