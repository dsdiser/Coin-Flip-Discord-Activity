import { WSContext } from 'hono/ws';
import { upgradeWebSocket } from 'hono/cloudflare-workers';
import { Hono } from 'hono';

interface RoomMember {
  userId: string;
  avatar?: string;
  ws: WSContext;
}
// Map roomId -> Set of ws clients
export const rooms = new Map<string, Set<RoomMember>>();

export function joinRoom(roomId: string, userId: string, ws: WSContext) {
  if (!rooms.has(roomId)) {
    console.debug(`Creating new room ${roomId}`);
    rooms.set(roomId, new Set<RoomMember>());
  }
  // TODO: fetch user avatar here
  const avatar = '';
  rooms.get(roomId)!.add({ userId, ws, avatar });
  // Broadcast presence to everyone in the room
  const presence = JSON.stringify({
    type: 'presence',
    roomId,
    members: Array.from(rooms.get(roomId)!).map((m) => ({
      id: m.userId,
      avatar: m.avatar ?? null,
    })),
  });
  broadcastToRoom(roomId, presence);
  console.debug('Rooms:', rooms);
}

export function leaveRoom(ws: WSContext) {
  // Find the room by ws
  for (const [roomId, members] of rooms.entries()) {
    for (const member of members) {
      if (member.ws === ws) {
        members.delete(member);
        // Broadcast updated presence to remaining members
        const presenceMsg = JSON.stringify({
          type: 'presence',
          roomId,
          members: Array.from(members).map((m) => ({ id: m.userId, avatar: m.avatar ?? null })),
        });
        broadcastToRoom(roomId, presenceMsg);
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
          if (msg && msg.type === 'join' && typeof msg.userId === 'string') {
            console.debug(`User ${msg.userId} joining room ${roomId}`);
            joinRoom(roomId, msg.userId, ws);
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
      onClose: (_event, ws) => {
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
