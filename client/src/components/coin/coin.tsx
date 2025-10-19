import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { cubicBezier, motion, useAnimation } from 'motion/react';
import { MersenneTwister19937, integer } from 'random-js';
import styles from './Coin.module.css';
import { useAtom, useAtomValue } from 'jotai';
import { startFlipAtom, seedAtom, flipAnimationDuration } from '../../state/coinAtoms';

export type CoinResult = 'heads' | 'tails';

export interface CoinProps {
  // Called when the coin is clicked to start the flip
  onFlip: () => void;
  // Called after the flip animation completes with the result
  onComplete: (result: CoinResult) => void;
  // Optional initial side to show (for deterministic UI)
  initial?: CoinResult;
}

const ROTATION_MIN = 15; // Minimum number of rotations
const ROTATION_MAX = 20; // Maximum number of rotations

/**
 * Simple coin component that flips on click and returns a random result.
 * Uses framer-motion for the flip animation and a CSS module for visuals.
 */
export const Coin: React.FC<CoinProps> = ({ onFlip, onComplete, initial = 'heads' }) => {
  const controls = useAnimation();
  const seed = useAtomValue(seedAtom);
  const [current, setCurrent] = useState(initial);
  const [isFlipping, setIsFlipping] = useState(false);
  const [startFlip, setStartFlip] = useAtom(startFlipAtom);
  const frontLabel = useMemo(() => (current === 'heads' ? 'HEADS' : 'TAILS'), []);

  // Initiates websocket message to start flip
  const initiateFlip = useCallback(() => {
    if (isFlipping || startFlip || !seed) return;
    onFlip();
  }, [isFlipping, startFlip, seed, onFlip]);

  // Handles calculating result and animation for flipping the coin
  const flip = useCallback(async () => {
    if (isFlipping || !seed) return;
    setIsFlipping(true);
    const mt = MersenneTwister19937.seed(seed);
    const result: CoinResult = integer(0, 1)(mt) ? 'heads' : 'tails';
    let rotations = integer(ROTATION_MIN, ROTATION_MAX)(mt); // 10..30
    if (rotations % 2 === 0 && result !== current) {
      rotations += 1;
    }
    // animate to rotationY where 0 = heads, 180 = tails
    const endRotation = result === 'heads' ? 360 * rotations : 180 + 360 * rotations;
    // Start animation
    await controls.start({
      rotateY: endRotation,
      transition: {
        duration: flipAnimationDuration,
        ease: cubicBezier(0.3, 0.8, 0.9, 1.03),
      },
    });

    // Normalize the displayed side and reset rotation
    setCurrent(result);
    controls.set({ rotateY: result === 'heads' ? 0 : 180 });
    setIsFlipping(false);

    onComplete(result);
    return result;
  }, [controls, isFlipping, seed]);

  // Listen for startFlip changes (from websocket), then trigger flip
  useEffect(() => {
    if (startFlip) {
      setStartFlip(false);
      flip();
    }
  }, [startFlip, flip, setStartFlip]);

  return (
    <motion.div
      className={styles.coin}
      onClick={initiateFlip}
      animate={controls}
      initial={{ rotateY: initial === 'heads' ? 0 : 180 }}
      style={{ rotateY: initial === 'heads' ? 0 : 180 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{
        scale: 1.25,
        rotate: -15,
        transition: { duration: 0.2, scale: { type: 'spring' } },
      }}
      role="button"
      aria-pressed={isFlipping}
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          initiateFlip();
        }
      }}
    >
      <div className={styles.face + ' ' + styles.front}>
        <div className={styles.label}>{frontLabel}</div>
      </div>
      <div className={styles.side} />
      <div className={styles.face + ' ' + styles.back}>
        <div className={styles.label}>{frontLabel === 'HEADS' ? 'TAILS' : 'HEADS'}</div>
      </div>
    </motion.div>
  );
};

export default Coin;
