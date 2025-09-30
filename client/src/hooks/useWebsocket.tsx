import { useEffect, useRef, useCallback } from 'react';
import { useAtom } from 'jotai';
import { pushIncomingAtom, IncomingMessage, OutgoingMessage, MessageType } from '../state/websocketAtoms';

export function useWebsocket(roomId = 'default-room', url = 'ws://localhost:3002') {
  const wsRef = useRef<WebSocket | null>(null);
  // pushIncomingAtom is write-only; useAtom returns [, write] signature
  const [, pushIncoming] = useAtom(pushIncomingAtom);

  const handleMessage = useCallback((parsedMessage: IncomingMessage) => {
    // Narrow and optionally handle known message types here (for logging or special handling)
    switch (parsedMessage.type) {
      case MessageType.Join:
        break;
      case MessageType.FlipStart:
        break;
      case MessageType.FlipResult:
        pushIncoming(parsedMessage);
        break;
      default:
        // Unknown type - still forward as an extensible message
        pushIncoming(parsedMessage);
        break;
    }
  }, [pushIncoming]);

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      // send join message
      const join: OutgoingMessage = { type: 'join', roomId, timestamp: Date.now() } as OutgoingMessage;
      ws.send(JSON.stringify(join));
    };

    ws.onmessage = (evt: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(evt.data) as IncomingMessage;
        // Basic validation: must have type
        if (!parsed || typeof parsed.type !== 'string') {
          console.warn('Malformed incoming message (missing type)', parsed);
          return;
        }
        handleMessage(parsed);
      } catch (err) {
        console.warn('Failed to parse websocket message', err);
      }
    };

    ws.onerror = (err) => {
      console.warn('Websocket error', err);
    };

    ws.onclose = () => {
      // noop for now
    };

    return () => {
      try { ws.close(); } catch (e) { }
      wsRef.current = null;
    };
  }, [url, roomId, pushIncoming]);

  const send = useCallback((message: OutgoingMessage) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('Websocket not open, cannot send');
      return;
    }
    // generate random id for message via simple random + timestamp
    message.id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    message.roomId = roomId;
    const stringifiedMessage = JSON.stringify(message);
    ws.send(stringifiedMessage);
  }, []);

  return { send, connectionStatus: wsRef.current?.readyState };
}

export default useWebsocket;
