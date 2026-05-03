# 10,000 Checkboxes

A real-time collaborative checkbox grid inspired by [One Million Checkboxes]. Every checkbox is shared live across all connected users. Built to scale horizontally — multiple server instances stay in sync via Redis pub/sub.

**Live link** tenk-checkbox.jahanwee.tech

## Features

- 10,000 shared checkboxes — toggle one, everyone sees it instantly
- Socket.io for real-time bidirectional communication
- Redis (or Valkey) pub/sub — multiple server instances stay in sync
- Bitset state storage — 10,000 checkbox states packed into 1,250 bytes in Redis
- Live stats — checked count, progress bar, global online user count
- Flash animation when a remote user toggles a checkbox
- Auto-reconnect on connection drop

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML / CSS / JS |
| Realtime | Socket.io v4 |
| Backend | Node.js (no framework) |
| State + Sync | Redis / Valkey (ioredis) |
| Deploy | Render |

## Local Development

### Prerequisites

- Node.js 18+
- Docker (for local Redis/Valkey)

### 1. Clone and install

```bash
git clone https://github.com/JAHANWEE/10000checkboxes.git
cd 10000checkboxes
npm install
```

### 2. Start Valkey (Redis-compatible) via Docker

```bash
docker compose up -d
```

This starts a Valkey instance on `localhost:6379`.

### 3. Configure environment

```bash
cp .env.example .env
```

The default `.env` points to the local Docker instance — no changes needed for local dev.

### 4. Start the server

```bash
npm start
```

Open `http://localhost:3000`. Open multiple tabs to see real-time sync in action.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port the HTTP + Socket.io server listens on |
| `REDIS_URL` | `redis://localhost:6379` | Redis / Valkey connection URL |

For Render's internal Redis, use the **Internal Database URL** (e.g. `redis://red-xxxx:6379`).
For external connections (local → Render Redis), use the **External Database URL** with `rediss://` (TLS).

## Project Structure

```
.
├── server.js          # Node.js HTTP + Socket.io server, Redis pub/sub
├── script.js          # Browser-side Socket.io client
├── index.html         # UI — sidebar + checkbox grid
├── docker-compose.yml # Local Valkey (Redis-compatible) for development
├── render.yaml        # Render IaC — web service + Redis definition
├── .env.example       # Environment variable template
└── package.json
```

## How It Works

```
Browser clicks checkbox
        ↓
socket.emit("toggle", { index })
        ↓
Server receives toggle
        ↓
Redis SETBIT (atomic flip)
        ↓
redisPub.publish("cb:updates", { type:"update", index, value })
        ↓
All server instances receive via redisSub
        ↓
Each instance: io.emit("update", ...) → all connected browsers update
```

State is stored as a Redis bitset — 10,000 bits = 1,250 bytes. On connect, the server reads the full bitset, base64-encodes it, and sends it to the new client in a single `init` event.

## License

MIT
