import { describe, it, expect } from 'vitest';
import { LogLevel, Miniflare } from 'miniflare';
import WebSocket from 'ws';

// This integration test runs Miniflare and exercises the Durable Object
// websocket path. It is gated behind the RUN_MINIFLARE env var so it won't
// execute in normal CI runs unless explicitly enabled.
const RUN = true;

describe('miniflare: RoomDO websocket integration', () => {
  it('accepts websocket connections, allows join/broadcast and survives hibernation', async () => {
    if (!RUN) {
      console.warn('Skipping Miniflare integration test (set RUN_MINIFLARE=1 to enable)');
      return;
    }

    // Start Miniflare with the worker at ../main (worker subdir) as an ES module.
    const mf = new Miniflare({
      scriptPath: new URL('../main.ts', import.meta.url).pathname,
      modules: true,
      durableObjects: {
        // Bind the name ROOM_DO to the class RoomDO exported by the module
        ROOM_DO: { className: 'RoomDO' },
      },
      // Enable global WebSocket emulation
      bindings: {},
    });

    try {
      const url = await mf.getLocalServer();

      // Connect two websocket clients to the /ws endpoint
      const ws1 = new WebSocket(url.replace('http', 'ws') + '/ws');
      const ws2 = new WebSocket(url.replace('http', 'ws') + '/ws');

      const waitOpen = (ws: WebSocket) =>
        new Promise<void>((resolve, reject) => {
          ws.once('open', () => resolve());
          ws.once('error', (err) => reject(err));
        });

      await Promise.all([waitOpen(ws1), waitOpen(ws2)]);

      const recv = (ws: WebSocket) =>
        new Promise<string>((resolve) => {
          ws.once('message', (data) => resolve(data.toString()));
        });

      // Have ws1 join room r1 as user u1
      ws1.send(JSON.stringify({ type: 'join', roomId: 'r1', userId: 'u1' }));
      // Wait for the join ack or presence message
      const ack1 = await recv(ws1);
      expect(ack1).toContain('joined');

      // Have ws2 join r1 as u2
      ws2.send(JSON.stringify({ type: 'join', roomId: 'r1', userId: 'u2' }));
      const ack2 = await recv(ws2);
      expect(ack2).toContain('joined');

      // ws1 sends a chat message which should be broadcast to ws2
      ws1.send(JSON.stringify({ type: 'msg', roomId: 'r1', text: 'hello-miniflare' }));
      const msgOn2 = await recv(ws2);
      expect(msgOn2).toContain('hello-miniflare');

      // Simulate hibernation by restarting Miniflare, which should rehydrate DOs
      await mf.stop();
      await mf.start();

      // Reconnect sockets (Miniflare will rebind any previously accepted websockets)
      const ws3 = new WebSocket(url.replace('http', 'ws') + '/ws');
      const ws4 = new WebSocket(url.replace('http', 'ws') + '/ws');
      await Promise.all([waitOpen(ws3), waitOpen(ws4)]);

      // Join again from a rehydrated context and broadcast
      ws3.send(JSON.stringify({ type: 'join', roomId: 'r1', userId: 'u3' }));
      await recv(ws3);

      ws3.send(JSON.stringify({ type: 'msg', roomId: 'r1', text: 'after-hib' }));
      const m = await recv(ws4);
      expect(m).toContain('after-hib');

      ws1.close();
      ws2.close();
      ws3.close();
      ws4.close();
    } finally {
      try {
        await mf.stop();
      } catch (e) {
        // ignore
      }
    }
  }, 30000);
});
