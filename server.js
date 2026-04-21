const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

const TOTAL = 10000;
// Bitset: 10000 bits = 1250 bytes
const state = Buffer.alloc(Math.ceil(TOTAL / 8), 0);

function getBit(i) {
  return (state[Math.floor(i / 8)] >> (7 - (i % 8))) & 1;
}

function setBit(i, val) {
  const byte = Math.floor(i / 8);
  const bit = 7 - (i % 8);
  if (val) {
    state[byte] |= 1 << bit;
  } else {
    state[byte] &= ~(1 << bit);
  }
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };

// HTTP server — serves static files
const httpServer = http.createServer((req, res) => {
  let filePath = req.url === "/" ? "/index.html" : req.url;
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || "text/plain";
  const file = path.join(__dirname, filePath);

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server: httpServer });

function broadcastUserCount() {
  const count = wss.clients.size;
  const msg = JSON.stringify({ type: "users", count });
  wss.clients.forEach((c) => { if (c.readyState === 1) c.send(msg); });
}

wss.on("connection", (ws) => {
  // Send full state on connect
  ws.send(JSON.stringify({ type: "init", state: state.toString("base64") }));
  broadcastUserCount();

  ws.on("close", () => broadcastUserCount());

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === "toggle" && typeof msg.index === "number") {
      const i = msg.index;
      if (i < 0 || i >= TOTAL) return;
      const newVal = getBit(i) ? 0 : 1;
      setBit(i, newVal);

      // Broadcast to all clients
      const broadcast = JSON.stringify({ type: "update", index: i, value: newVal });
      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(broadcast);
        }
      });
    }
  });
});

const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
