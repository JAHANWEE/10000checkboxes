# 10,000 Checkboxes

A real-time collaborative checkbox grid inspired by [One Million Checkboxes](https://eieio.games/blog/scaling-one-million-checkboxes/). Every checkbox is synchronized across all connected users via WebSockets.

## Features

- **10,000 shared checkboxes** — check or uncheck any box, and it updates for everyone instantly
- **Real-time WebSocket sync** — all changes broadcast to connected clients
- **Efficient bitset storage** — server stores state in just 1,250 bytes
- **Live stats** — see checked/unchecked counts, progress bar, and connected users
- **Smooth animations** — flash effect when remote users toggle checkboxes
- **Auto-reconnect** — client automatically reconnects if connection drops

## Tech Stack

- **HTML/CSS/JS** — pure vanilla frontend, no frameworks
- **Node.js** — HTTP server and WebSocket server
- **ws** — WebSocket library for Node.js
- **Bitset** — efficient binary state storage using Node.js Buffer

## Installation

```bash
npm install
```

## Usage

Start the server:

```bash
npm start
```

Then open your browser to:

```
http://localhost:3000
```

Open multiple tabs or share with friends to see real-time synchronization in action!

## How It Works

The server maintains checkbox state as a bitset (10,000 bits = 1,250 bytes). When a client toggles a checkbox:

1. Client sends `{ type: "toggle", index: N }` via WebSocket
2. Server flips the bit at index N
3. Server broadcasts `{ type: "update", index: N, value: 0|1 }` to all clients
4. All clients update their checkbox and play a flash animation

On initial connection, the server sends the full bitset as base64, and the client decodes it to initialize all 10,000 checkboxes.

## Inspiration

This project was inspired by Nolen Royalty's viral [One Million Checkboxes](https://eieio.games/blog/scaling-one-million-checkboxes/) experiment, which handled 650 million checkbox toggles from thousands of concurrent users. Content was rephrased for compliance with licensing restrictions.

## License

MIT
