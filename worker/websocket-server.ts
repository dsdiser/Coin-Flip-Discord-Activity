import { WSContext } from 'hono/ws';
import { upgradeWebSocket } from 'hono/cloudflare-workers';
import { Hono } from 'hono';

interface RoomMember {
  userId: string;
  address?: string;
  ws: WSContext;
}
// Map roomId -> Set of ws clients
export const rooms = new Map<string, Set<RoomMember>>();

export function joinRoom(roomId: string, userId: string, ws: WSContext) {
  if (!rooms.has(roomId)) {
    console.debug(`Creating new room ${roomId}`);
    rooms.set(roomId, new Set<RoomMember>());
  }
  rooms.get(roomId)!.add({ userId, ws });
  console.debug('Rooms:', rooms);
}

export function leaveRoom(ws: WSContext) {
  // Find the room by ws
  for (const [roomId, members] of rooms.entries()) {
    for (const member of members) {
      if (member.ws === ws) {
        members.delete(member);
        if (members.size === 0) rooms.delete(roomId);
        return;
      }
    }
  }
}

export function broadcastToRoom(roomId: string, data: any) {
  const set = rooms.get(roomId);
  if (!set) return;
  for (const roomMember of set) {
    if (roomMember.ws.readyState === 1) {
      roomMember.ws.send(data);
    } else if ([2, 3].includes(roomMember.ws.readyState)) {
      // Closed or closing, remove from set
      set.delete(roomMember);
      if (set.size === 0) rooms.delete(roomId);
    }
  }
}

export const WebSocketApp = new Hono().get(
  '/',
  upgradeWebSocket((_c) => {
    return {
      onMessage(event, ws) {
        try {
          const msg = JSON.parse(event.data.toString());
          const roomId = msg.roomId;
          // Handle join specially
          if (msg && msg.type === 'join' && typeof msg.id === 'string') {
            console.debug(`User ${msg.id} joining room ${roomId}`);
            joinRoom(roomId, msg.id, ws);
            const ack = JSON.stringify({
              type: 'joined',
              roomId: roomId,
              timestamp: Date.now(),
            });
            ws.send(ack);
            return;
          }

          // If the socket has a room, broadcast to room; otherwise ignore
          if (roomId && typeof roomId === 'string') {
            broadcastToRoom(roomId, JSON.stringify(msg));
            return;
          }
        } catch (err) {
          console.warn('Failed to handle message', err);
        }
      },
      onClose: (event, ws) => {
        if (ws) {
          leaveRoom(ws);
        }
        ws.close();
      },
      onError: (event) => {
        console.error('WebSocket error:', event);
      },
    };
  })
);
