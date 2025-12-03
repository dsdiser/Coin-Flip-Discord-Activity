import { atom, createStore } from 'jotai';
import { atomWithListeners } from './atomWithListeners';
import { createEntropy } from 'random-js';

export const flipAnimationDuration = 4.5; // seconds
export const [startFlipAtom, useStartFlipListener] = atomWithListeners<boolean>(false);

// Seed atom (for coin flip animation)
export const seedStore = createStore();
const seed = createEntropy();

export const seedAtom = atom<number>(seed[0]);
seedStore.set(seedAtom, seed[0]);
// Utility to set a new random seed
export const setRandomSeedAtom = atom(null, (_get, set) => {
  // make a random int32
  const seed = createEntropy();
  set(seedAtom, seed[0]);
  seedStore.set(seedAtom, seed[0]);
});
