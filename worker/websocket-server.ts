import { upgradeWebSocket } from 'hono/cloudflare-workers';
import { Hono } from 'hono';
import { broadcastToRoom, joinRoom, leaveRoom } from './room-utils';

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
            joinRoom(roomId, msg.userId, msg.avatar, ws);
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
