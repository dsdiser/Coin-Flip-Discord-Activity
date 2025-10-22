interface RoomMember {
  userId: string;
  avatar?: string;
  ws: WebSocket;
}
export class RoomDO {
  state: any;
  env: any;
  connections: Map<string, Set<RoomMember>>;

  constructor(state: any, env: any) {
    this.state = state;
    this.env = env;
    this.connections = new Map<string, Set<RoomMember>>();

    // Rehydrate any accepted websockets after hibernation if supported
    try {
      const getWebSockets =
        this.state.getWebSockets || (this.state.ctx && this.state.ctx.getWebSockets);
      const websockets =
        typeof getWebSockets === 'function' ? getWebSockets.call(this.state) : undefined;
      if (websockets && Array.isArray(websockets)) {
        for (const _ws of websockets) {
          // Can't map these to rooms until client sends a join message; noop for now
        }
      }
    } catch (e) {
      console.debug('RoomDO: getWebSockets not available during construction');
    }
  }

  // fetch is used as the handoff for websocket upgrades from the Worker
  async fetch(req: Request) {
    const upgradeHeader = req.headers.get('upgrade') || '';
    if (upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const PairCtor = (globalThis as any).WebSocketPair;
    const pair: any =
      typeof PairCtor === 'function' ? new PairCtor() : { 0: undefined, 1: undefined };
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

    // Accept the server side so Cloudflare can hibernate the DO when idle
    try {
      const accept =
        this.state.acceptWebSocket || (this.state.ctx && this.state.ctx.acceptWebSocket);
      if (typeof accept === 'function') accept.call(this.state, server);
    } catch (err) {
      console.error('RoomDO: acceptWebSocket failed', err);
    }

    // Attach basic event handlers on the client socket. Cloudflare will route
    // webSocketMessage/webSocketClose/webSocketError to Durable Object methods
    // if using the handler API; but local handlers keep behavior explicit here.
    try {
      if (client && typeof client.addEventListener === 'function') {
        client.addEventListener('close', () => this.removeSocketFromAllRooms(client));
        client.addEventListener('error', () => this.removeSocketFromAllRooms(client));
      }
    } catch (e) {
      // ignore
    }

    // TS typing for Response with webSocket is not standard; cast to any to avoid errors
    return new Response(null as any, { status: 101 }) as any as Response;
  }

  // Durable Object Hibernation API handlers
  webSocketMessage(ws: WebSocket, data: string) {
    try {
      const msg = JSON.parse(data.toString());
      if (
        msg &&
        msg.type === 'join' &&
        typeof msg.roomId === 'string' &&
        typeof msg.userId === 'string'
      ) {
        this.addMemberToRoom(msg.roomId, { userId: msg.userId, avatar: msg.avatar, ws });
        // send ack
        try {
          ws.send(JSON.stringify({ type: 'joined', roomId: msg.roomId, timestamp: Date.now() }));
        } catch (e) {
          console.warn('RoomDO: failed to send join ack', e);
        }
        // broadcast presence
        this.broadcast(
          msg.roomId,
          JSON.stringify({
            type: 'presence',
            roomId: msg.roomId,
            members: this.listMembers(msg.roomId),
          })
        );
        return;
      }

      // Other messages are treated as room broadcasts if they include roomId
      if (msg && typeof msg.roomId === 'string') {
        this.broadcast(msg.roomId, JSON.stringify(msg));
      }
    } catch (err) {
      console.warn('RoomDO: Failed to handle message', err);
    }
  }

  webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean) {
    this.removeSocketFromAllRooms(ws);
  }

  webSocketError(ws: WebSocket, _error: unknown) {
    this.removeSocketFromAllRooms(ws);
  }

  addMemberToRoom(roomId: string, member: RoomMember) {
    if (!this.connections.has(roomId)) this.connections.set(roomId, new Set<RoomMember>());
    const set = this.connections.get(roomId)!;
    // Remove any existing member with same ws
    for (const m of set) {
      if (m.ws === member.ws) {
        set.delete(m);
      }
    }
    set.add(member);
  }

  removeSocketFromAllRooms(ws: WebSocket) {
    for (const [roomId, set] of this.connections.entries()) {
      for (const m of Array.from(set)) {
        if (m.ws === ws) {
          set.delete(m);
        }
      }
      if (set.size === 0) this.connections.delete(roomId);
    }
  }

  listMembers(roomId: string) {
    const set = this.connections.get(roomId);
    if (!set) return [];
    return Array.from(set).map((m) => ({ id: m.userId, avatar: m.avatar }));
  }

  async broadcast(roomId: string, message: string) {
    const set = this.connections.get(roomId);
    if (!set) return;
    for (const member of Array.from(set)) {
      try {
        if (member.ws.readyState === 1) member.ws.send(message);
        else {
          set.delete(member);
        }
      } catch (e) {
        console.warn('RoomDO: failed to send to member', e);
        set.delete(member);
      }
    }
    if (set.size === 0) this.connections.delete(roomId);
  }
}
