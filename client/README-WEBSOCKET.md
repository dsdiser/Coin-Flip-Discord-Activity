WebSocket usage and message format

This project adds a tiny WebSocket layer and Jotai atoms to synchronize state across clients and a host.

Server expectations
- A WebSocket server listening at ws://localhost:3002 (default) is expected for development.
- When a client connects it will send: { type: 'join', roomId: '<id>', timestamp }
- Host/client messages should be JSON objects stringified before sending.

Message shape (incoming/outgoing):
- Common fields: { type: string, roomId?: string, payload?: any, seed?: number, from?: string, timestamp?: number }

Example: host starts a flip with a seed
{ type: 'flip:start', roomId: 'demo-room', seed: 12345, from: 'host-id', timestamp: 123456789 }

Atoms
- incomingMessageAtom: last parsed incoming message
- messageHistoryAtom: array of recent messages (up to 50)
- seedAtom: current seed (if message contains a seed it's set)
- pushIncomingAtom: write-only atom used by websocket hook to push messages into state

Hook
- useWebsocket(roomId?, url?)
  - connects and sends a join message
  - parses incoming messages and writes them to atoms
  - returns { send(message) } to send messages

Notes
- Clients are "trusted" in this simple implementation: when they send a global state message it will be broadcast by the server (server must implement that).
- Keep server implementation simple: accept join, and when it receives a message from a client, broadcast it to everyone in the same room.

Testing
1. Run a simple WS server (example Node server not included). The app expects ws://localhost:3002 by default.
2. Start the client (vite dev).
3. Click "Flip (host)" to send a flip:start with a random seed.
4. Connected clients will receive the message and the seed will be stored in `seedAtom`.

This file is intended as a quick reference only.
