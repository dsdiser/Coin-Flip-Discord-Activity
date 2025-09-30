import { atom } from 'jotai';

export enum MessageType {
  Join = 'join',
  FlipStart = 'flip:start',
  FlipResult = 'flip:result',
}

interface BaseMessage {
  type: MessageType;
  roomId?: string; // This is optional to allow clients to craft messages easier, but useWebsocket will always set it
  timestamp?: number;
  id: string;
}

// Specific message shapes
export interface JoinMessage extends BaseMessage {
  type: MessageType.Join;
}

export interface FlipStartMessage extends BaseMessage {
  type: MessageType.FlipStart;
  seed: number;
  from?: string;
}

export interface FlipResultMessage extends BaseMessage {
  type: MessageType.FlipResult;
  payload: {
    result: string; // 'heads' | 'tails' etc. Keep generic string for now
    seed?: number;
  };
  from?: string;
}

export type IncomingMessage =
  | JoinMessage
  | FlipStartMessage
  | FlipResultMessage
  | ({ type: string } & Record<string, unknown>);

export type OutgoingMessage = IncomingMessage | ({ type: string } & Record<string, unknown>);

// Base incoming raw message atom (last parsed incoming message)
export const incomingMessageAtom = atom<IncomingMessage | null>(null);

// Message history atom - append every incoming message (keeps small history)
export const messageHistoryAtom = atom<IncomingMessage[]>([]);

// Seed atom (for coin flip animation)
export const seedAtom = atom<number | null>(null);

// Derived atom: last message
export const lastMessageAtom = atom<IncomingMessage | null>((get) => {
  const history = get(messageHistoryAtom);
  return history.length ? history[history.length - 1] : null;
});

// A small utility write-only atom to push an incoming message into history and set incoming
export const pushIncomingAtom = atom(null, (get, set, incoming: IncomingMessage) => {
  set(incomingMessageAtom, incoming);
  const prev = get(messageHistoryAtom);
  // keep last 20 messages
  set(messageHistoryAtom, [...prev, incoming].slice(-20));
  // If message is FlipStartMessage, set seed
  if (incoming && (incoming as FlipStartMessage).type === MessageType.FlipStart) {
    const flip = incoming as FlipStartMessage;
    set(seedAtom, flip.seed);
  }
});
