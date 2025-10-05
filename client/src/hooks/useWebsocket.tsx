import { useEffect, useRef, useCallback } from 'react';
import { useSetAtom } from 'jotai';
import {
  pushIncomingAtom,
  IncomingMessage,
  OutgoingMessage,
  MessageType,
  FlipStartMessage,
} from '../state/websocketAtoms';
import { seedAtom, startFlipAtom } from '../state/coinAtoms';

const metaVars = (import.meta as any).env;

const isInIframe = window.self !== window.top;
let defaultUrl = `wss://${metaVars.VITE_URL}/ws`;
// In discord iframe can only connect to a websocket that is in proxy
// Instead of example.com/ws, you use <appid>.discordsays.com/.proxy/ws
// Make sure the redirect is set up in application's activity URL mappings in dev console
if (isInIframe) {
  defaultUrl = `wss://${metaVars.VITE_DISCORD_CLIENT_ID}.discordsays.com/.proxy/ws`;
}

export function useWebsocket(roomId = 'default-room') {
  const wsRef = useRef<WebSocket | null>(null);
  const setStartFlip = useSetAtom(startFlipAtom);
  const setSeed = useSetAtom(seedAtom);
  const setPushIncoming = useSetAtom(pushIncomingAtom);

  const handleMessage = useCallback(
    (parsedMessage: IncomingMessage) => {
      // Set specific atoms based on the message type, then push to specific atoms for handling
      // We can then use the atoms directly or use atomWithListeners to use a callback
      switch (parsedMessage.type) {
        case MessageType.Join:
          break;
        case MessageType.FlipStart:
          setStartFlip(true);
          setSeed((parsedMessage as FlipStartMessage).seed);
          break;
        case MessageType.FlipResult:
          break;
        default:
          // Unknown type - still forward as an extensible message
          break;
      }
      setPushIncoming(parsedMessage);
    },
    [setPushIncoming, setStartFlip]
  );

  useEffect(() => {
    const ws = new WebSocket(defaultUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // send join message
      const join: OutgoingMessage = {
        type: 'join',
        roomId,
        timestamp: Date.now(),
      } as OutgoingMessage;
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
      try {
        ws.close();
      } catch (e) {}
      wsRef.current = null;
    };
  }, [roomId, setPushIncoming]);

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
