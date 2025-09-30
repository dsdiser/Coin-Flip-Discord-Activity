import React, { useCallback, useMemo, useState } from 'react';
import { motion, useAnimation } from 'motion/react';
import { MersenneTwister19937, integer, real } from 'random-js';
import styles from './Coin.module.css';
import { useAtomValue } from 'jotai';
import { seedAtom } from '../../state/websocketAtoms';

export type CoinResult = 'heads' | 'tails';

export interface CoinProps {
  // Called after the flip animation completes with the result
  onComplete: (result: CoinResult) => void;
  // Optional initial side to show (for deterministic UI)
  initial?: CoinResult;
  // Optional className to allow parent styling
  className?: string;
}

const ROTATION_MIN = 10; // Minimum number of rotations
const ROTATION_MAX = 30; // Maximum number of rotations

/**
 * Simple coin component that flips on click and returns a random result.
 * Uses framer-motion for the flip animation and a CSS module for visuals.
 */
export const Coin: React.FC<CoinProps> = ({ onComplete, initial = 'heads', className }) => {
  const controls = useAnimation();
  const seed = useAtomValue(seedAtom);
  const [current, setCurrent] = useState<CoinResult>(initial);
  const [isFlipping, setIsFlipping] = useState(false);

  const flip = useCallback(async () => {
    if (isFlipping || !seed) return;
    setIsFlipping(true);
    const mt = MersenneTwister19937.seed(seed);
    // Decide random result
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
      transition: { duration: 1.0 + real(0, 1)(mt) * 0.6, ease: [0.2, 0.8, 0.2, 1] },
    });

    // Normalize the displayed side and reset rotation to a safe value to avoid growing numbers
    setCurrent(result);
    controls.set({ rotateY: result === 'heads' ? 0 : 180 });
    setIsFlipping(false);

    onComplete(result);
    return result;
  }, [controls, isFlipping, seed]);

  const frontLabel = useMemo(() => (current === 'heads' ? 'HEADS' : 'TAILS'), []);

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      <motion.div
        className={styles.coin}
        onClick={flip}
        animate={controls}
        initial={{ rotateY: initial === 'heads' ? 0 : 180 }}
        style={{ rotateY: initial === 'heads' ? 0 : 180 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{
          scale: 1.25,
          rotate: -5,
          transition: { duration: 0.2, scale: { type: 'spring' } },
        }}
        role="button"
        aria-pressed={isFlipping}
        tabIndex={0}
        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            flip();
          }
        }}
      >
        <div className={styles.face + ' ' + styles.front}>
          <div className={styles.label}>{frontLabel}</div>
        </div>
        <div className={styles.face + ' ' + styles.back}>
          <div className={styles.label}>{frontLabel === 'HEADS' ? 'TAILS' : 'HEADS'}</div>
        </div>
      </motion.div>
    </div>
  );
};

export default Coin;
