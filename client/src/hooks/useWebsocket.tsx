import { useEffect, useRef, useCallback } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  pushIncomingAtom,
  IncomingMessage,
  OutgoingMessage,
  MessageType,
  FlipStartMessage,
  JoinMessage,
  PresenceMessage,
} from '../state/websocketAtoms';
import { seedAtom, startFlipAtom } from '../state/coinAtoms';
import { hc } from 'hono/client';
import { type appType } from '../../../worker/main';
import { userAtom } from '../state/userAtoms';
import { type RemoteMember, roomMembersAtom } from '../state/userAtoms';

const metaVars = (import.meta as any).env;

function createMessageId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

const isInIframe = window.self !== window.top;
let defaultUrl = window.location.href;
// In discord iframe can only connect to a websocket that is in proxy
// Instead of example.com/ws, you use <appid>.discordsays.com/.proxy/ws
// Make sure the redirect is set up in application's activity URL mappings in dev console
if (isInIframe) {
  defaultUrl = `wss://${metaVars.VITE_DISCORD_CLIENT_ID}.discordsays.com/.proxy/ws`;
}

export function useWebsocket(roomId: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const user = useAtomValue(userAtom);
  const setStartFlip = useSetAtom(startFlipAtom);
  const setSeed = useSetAtom(seedAtom);
  const setPushIncoming = useSetAtom(pushIncomingAtom);
  const setRoomMembers = useSetAtom(roomMembersAtom);

  const handleMessage = useCallback(
    (parsedMessage: IncomingMessage) => {
      // Set specific atoms based on the message type, then push to specific atoms for handling
      // We can then use the atoms directly or use atomWithListeners to use a callback
      switch (parsedMessage.type) {
        case MessageType.Join:
          // legacy join acknowledgement - ignore or use if needed
          break;
        case MessageType.Presence:
          const members = (parsedMessage as PresenceMessage).members as Array<RemoteMember>;
          setRoomMembers(members);
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
    const pingServer = async () => {
      const client = hc<appType>('/');
      const res = await client.ping.$get();
      if (res.status === 200) {
        console.log('Ping successful to server', await res.text());
      } else {
        console.warn('Ping to server failed with status', res.status);
      }
    };
    pingServer();
  }, []);

  useEffect(() => {
    const client = hc<appType>(defaultUrl);
    const ws = client.ws.$ws(0);
    wsRef.current = ws;

    ws.onopen = () => {
      send({ type: MessageType.Join, roomId });
    };

    ws.onmessage = (evt: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(evt.data) as IncomingMessage;
        console.debug('Received websocket message', parsed);
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
      console.debug('Websocket closed.');
      ws.close();
    };

    return () => {
      try {
        ws.close();
      } catch (e) {}
      wsRef.current = null;
    };
  }, [roomId, setPushIncoming]);

  const send = useCallback((message: OutgoingMessage) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.warn('Websocket not open, cannot send');
      return;
    }
    if (!user) {
      console.warn('No user, cannot send message');
      return;
    }
    message.id = createMessageId();
    message.userId = user.id;
    message.roomId = roomId;
    message.timestamp = Date.now();
    const stringifiedMessage = JSON.stringify(message);
    wsRef.current?.send(stringifiedMessage);
  }, []);

  return { send, connectionStatus: wsRef.current?.readyState || WebSocket.CLOSED };
}

export default useWebsocket;
