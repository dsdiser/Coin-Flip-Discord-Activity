import { atom } from 'jotai';
import { atomWithListeners } from './atomWithListeners';
import { createEntropy } from 'random-js';

export const [startFlipAtom, useStartFlipListener] = atomWithListeners<boolean>(false);
// Seed atom (for coin flip animation)
const seed = createEntropy(undefined, 1);
export const seedAtom = atom<number>(seed[0]);
// Utility to set a new random seed
export const setRandomSeedAtom = atom(null, (_get, set) => {
  // make a random int32
  const seed = createEntropy(undefined, 1);
  set(seedAtom, seed[0]);
});
