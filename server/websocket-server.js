import { WebSocketServer } from 'ws';

// Simple room-based WebSocket server for local testing
// - Listens on port 3002
// - Clients send a { type: 'join', roomId } message to join a room
// - Any message sent from a client is broadcast to all clients in the same room (including sender)

const PORT = process.env.PORT ? Number(process.env.WS_PORT) : 3002;

const wss = new WebSocketServer({ port: PORT });

// Map roomId -> Set of ws clients
const rooms = new Map();

function joinRoom(ws, roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  rooms.get(roomId).add(ws);
  ws.roomId = roomId;
}

function leaveRoom(ws) {
  const roomId = ws.roomId;
  if (!roomId) return;
  const set = rooms.get(roomId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) rooms.delete(roomId);
}

function broadcastToRoom(roomId, data) {
  const set = rooms.get(roomId);
  if (!set) return;
  for (const client of set) {
    if (client.readyState === client.OPEN) {
      client.send(data);
    }
  }
}

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    console.debug('Received message', raw.toString());
    try {
      const str = raw.toString();
      const msg = JSON.parse(str);
      // Handle join specially
      if (msg && msg.type === 'join' && typeof msg.roomId === 'string') {
        joinRoom(ws, msg.roomId);
        // Optionally ack
        const ack = JSON.stringify({ type: 'joined', roomId: msg.roomId, timestamp: Date.now() });
        ws.send(ack);
        return;
      }

      // If the socket has a room, broadcast to room; otherwise ignore
      const roomId = ws.roomId || (msg && msg.roomId);
      if (roomId && typeof roomId === 'string') {
        broadcastToRoom(roomId, JSON.stringify(msg));
      }
    } catch (err) {
      console.warn('Failed to handle message', err);
    }
  });

  ws.on('close', () => {
    console.debug('Client disconnected, leaving room');
    leaveRoom(ws);
  });
});

console.log(`WebSocket server listening on ws://localhost:${PORT}`);
