import { atomWithListeners } from './atomWithListeners';

export const [startFlipAtom, useStartFlipListener] = atomWithListeners<boolean>(false);
