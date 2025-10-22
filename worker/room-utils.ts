import { WSContext } from 'hono/ws';

interface RoomMember {
  userId: string;
  avatar?: string;
  ws: WSContext;
}
// Map roomId -> Set of ws clients
export const rooms = new Map<string, Set<RoomMember>>();

export function joinRoom(
  roomId: string,
  userId: string,
  avatar: string | undefined,
  ws: WSContext
) {
  if (!rooms.has(roomId)) {
    console.debug(`Creating new room ${roomId}`);
    rooms.set(roomId, new Set<RoomMember>());
  }
  rooms.get(roomId)!.add({ userId, ws, avatar });
  // Broadcast presence to everyone in the room
  const presence = JSON.stringify({
    type: 'presence',
    roomId,
    members: Array.from(rooms.get(roomId)!).map((m) => ({
      id: m.userId,
      avatar: m.avatar,
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
          members: Array.from(members).map((m) => ({ id: m.userId, avatar: m.avatar })),
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
