import { describe, test, expect, beforeEach } from 'vitest';
import { rooms, joinRoom, broadcastToRoom, leaveRoom } from '../websocket-server';

type MockWS = {
  readyState: number;
  sent: string[];
  toString(): string;
  send(s: string): void;
};

function createMockWS(payload: any): MockWS {
  const str = JSON.stringify(payload);
  return {
    readyState: 1,
    sent: [],
    toString() {
      return str;
    },
    send(s: string) {
      this.sent.push(s);
    },
  };
}

beforeEach(() => {
  // Clear shared rooms map before each test
  rooms.clear();
});

describe('websocket helpers', () => {
  test('joinRoom adds member and broadcast sends to ready clients', () => {
    const ws1 = createMockWS({ type: 'join', id: 'user1', roomId: 'roomA' }) as any;
    const ws2 = createMockWS({ type: 'join', id: 'user2', roomId: 'roomA' }) as any;

    joinRoom('roomA', 'user1', ws1);
    joinRoom('roomA', 'user2', ws2);

    expect(rooms.has('roomA')).toBe(true);
    const set = rooms.get('roomA')!;
    expect(set.size).toBe(2);

    broadcastToRoom('roomA', JSON.stringify({ type: 'msg', text: 'hello' }));

    // Both clients should have received the broadcast
    expect(ws1.sent).toContain(JSON.stringify({ type: 'msg', text: 'hello' }));
    expect(ws2.sent).toContain(JSON.stringify({ type: 'msg', text: 'hello' }));
  });

  test('leaveRoom removes member and deletes room when empty', () => {
    const ws = createMockWS({ type: 'join', id: 'u', roomId: 'roomB' }) as any;
    joinRoom('roomB', 'u', 'addrX', ws);

    expect(rooms.has('roomB')).toBe(true);

    leaveRoom('addrX');

    expect(rooms.has('roomB')).toBe(false);
  });
});
