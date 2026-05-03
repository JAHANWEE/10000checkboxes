const http = require("http");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");
const Redis = require("ioredis");

require("dotenv").config();

const PORT      = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const TOTAL      = 10000;
const STATE_KEY  = "cb:state";       
const PUB_CHAN   = "cb:updates";     

const redisState = new Redis(REDIS_URL);
const redisPub   = new Redis(REDIS_URL);
const redisSub   = new Redis(REDIS_URL);

redisState.on("error", (e) => console.error("[redis:state]", e.message));
redisPub.on("error",   (e) => console.error("[redis:pub]",   e.message));
redisSub.on("error",   (e) => console.error("[redis:sub]",   e.message));

function getBit(buf, i) {
  return (buf[Math.floor(i / 8)] >> (7 - (i % 8))) & 1;
}

function setBit(buf, i, val) {
  const byte = Math.floor(i / 8);
  const bit  = 7 - (i % 8);
  if (val) buf[byte] |=  (1 << bit);
  else     buf[byte] &= ~(1 << bit);
}

async function loadState() {
  const raw = await redisState.getBuffer(STATE_KEY);
  if (raw && raw.length === Math.ceil(TOTAL / 8)) return raw;
  const blank = Buffer.alloc(Math.ceil(TOTAL / 8), 0);
  await redisState.set(STATE_KEY, blank);
  return blank;
}

async function persistBit(index, value) {
  await redisState.setbit(STATE_KEY, index, value);
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };

const httpServer = http.createServer((req, res) => {
  let filePath = req.url === "/" ? "/index.html" : req.url;
  
  filePath = filePath.split("?")[0].split("#")[0];
  const ext         = path.extname(filePath);
  const contentType = MIME[ext] || "text/plain";
  const file        = path.join(__dirname, filePath);

  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
});

const io = new Server(httpServer, {
  cors: { origin: "*" },          
  transports: ["websocket", "polling"],
});

(async () => {
  const stateBuffer = await loadState();
  console.log(`[boot] state loaded (${stateBuffer.length} bytes)`);

  await redisSub.subscribe(PUB_CHAN);

  redisSub.on("message", (_channel, message) => {
    let msg;
    try { msg = JSON.parse(message); } catch { return; }

    if (msg.type === "update") {
      setBit(stateBuffer, msg.index, msg.value);
      io.emit("update", { index: msg.index, value: msg.value });
    }

    if (msg.type === "users") {
      io.emit("users", { count: msg.count });
    }
  });
  const USERS_KEY = "cb:users";

  async function userJoined() {
    const count = await redisState.incr(USERS_KEY);
    await redisPub.publish(PUB_CHAN, JSON.stringify({ type: "users", count }));
  }

  async function userLeft() {
    const count = await redisState.decr(USERS_KEY);
    const safe  = Math.max(0, count);
    if (safe !== count) await redisState.set(USERS_KEY, 0);
    await redisPub.publish(PUB_CHAN, JSON.stringify({ type: "users", count: safe }));
  }

  io.on("connection", async (socket) => {
    socket.emit("init", { state: stateBuffer.toString("base64") });
    await userJoined();

    socket.on("toggle", async ({ index }) => {
      if (typeof index !== "number" || index < 0 || index >= TOTAL) return;

      const current = await redisState.getbit(STATE_KEY, index);
      const newVal  = current ? 0 : 1;
      await persistBit(index, newVal);

      setBit(stateBuffer, index, newVal);

      await redisPub.publish(
        PUB_CHAN,
        JSON.stringify({ type: "update", index, value: newVal })
      );
    });

    socket.on("disconnect", async () => {
      await userLeft();
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
  });
})();
