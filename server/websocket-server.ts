import { WSContext } from 'hono/ws';
import { APP } from './honoDef';
import { upgradeWebSocket, getConnInfo } from 'hono/cloudflare-workers';

interface RoomMember {
  userId: string;
  address: string;
  ws?: WSContext;
}
// Map roomId -> Set of ws clients
const rooms = new Map<string, Set<RoomMember>>();

function joinRoom(roomId: string, userId: string, address: string, ws: WSContext) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set<RoomMember>());
  }
  rooms.get(roomId)!.add({ userId, address, ws });
}

function leaveRoom(url: string) {
  // Find the room by URL (as we don't have ws here)
  for (const [roomId, members] of rooms.entries()) {
    for (const member of members) {
      if (member.address === url) {
        members.delete(member);
        if (members.size === 0) rooms.delete(roomId);
        return;
      }
    }
  }
}

function broadcastToRoom(roomId: string, data: any) {
  const set = rooms.get(roomId);
  if (!set) return;
  for (const client of set) {
    if (client.ws && client.ws.readyState === 1) {
      client.ws.send(data);
    }
  }
}

APP.get(
  '/ws',
  upgradeWebSocket((c) => {
    const connInfo = getConnInfo(c);
    let roomId: string = 'none';
    return {
      onMessage(event, ws) {
        console.debug('Received message', ws.toString());
        try {
          const str = ws.toString();
          const msg = JSON.parse(str);
          roomId = msg.roomId;
          // Handle join specially
          if (msg && msg.type === 'join' && typeof msg.id === 'string' && connInfo.remote.address) {
            joinRoom(roomId, msg.id, connInfo.remote.address, ws);
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
          }
        } catch (err) {
          console.warn('Failed to handle message', err);
        }
      },
      onClose: (event, ws) => {
        console.debug('Client disconnected, leaving room');
        if (connInfo.remote.address) {
          leaveRoom(connInfo.remote.address);
        }
      },
      onError: (event) => {
        console.error('WebSocket error:', event);
      },
    };
  })
);
