import React, { useCallback, useMemo, useState } from "react";
import { motion, useAnimation } from 'motion/react'
import styles from "./Coin.module.css";

export type CoinResult = "heads" | "tails";

export interface CoinProps {
  // Called after the flip animation completes with the result
  onComplete: (result: CoinResult) => void;
  // Optional initial side to show (for deterministic UI)
  initial?: CoinResult;
  // Optional className to allow parent styling
  className?: string;
}

/**
 * Simple coin component that flips on click and returns a random result.
 * Uses framer-motion for the flip animation and a CSS module for visuals.
 */
export const Coin: React.FC<CoinProps> = ({ onComplete, initial = "heads", className }) => {
  const controls = useAnimation();
  const [current, setCurrent] = useState<CoinResult>(initial);
  const [isFlipping, setIsFlipping] = useState(false);

  const flip = useCallback(async () => {
    if (isFlipping) return;
    setIsFlipping(true);

    // Decide random result ahead of time so we can land on it
    const result: CoinResult = Math.random() < 0.5 ? "heads" : "tails";

    // Choose a random number of full rotations for variety
    // TODO: FIX bug in flip not ending on the correct side. We should set the num of rotations based on current front face and result.
    const rotations = 10 + Math.floor(Math.random() * 20); // 10..30

    // Animate a 3D Y rotation that ends depending on the result.
    // We'll animate to rotationY where 0 = heads, 180 = tails
    const endRotation = result === "heads" ? 360 * rotations : 180 + 360 * rotations;

    // Start animation
    await controls.start({
      rotateY: endRotation,
      transition: { duration: 1.0 + Math.random() * 0.6, ease: [0.2, 0.8, 0.2, 1] },
    });

    // Normalize the displayed side and reset rotation to a safe value to avoid growing numbers
    setCurrent(result);
    controls.set({ rotateY: result === "heads" ? 0 : 180 });
    setIsFlipping(false);

    onComplete(result);
    return result;
  }, [controls, isFlipping]);

  const frontLabel = useMemo(() => (current === "heads" ? "HEADS" : "TAILS"), [current]);

  return (
    <div className={`${styles.wrapper} ${className ?? ""}`}>
      <motion.div
        className={styles.coin}
        onClick={flip}
        animate={controls}
        initial={{ rotateY: initial === "heads" ? 0 : 180 }}
        style={{ rotateY: initial === "heads" ? 0 : 180 }}
        whileTap={{ scale: 0.95 }}
        role="button"
        aria-pressed={isFlipping}
        tabIndex={0}
        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            flip();
          }
        }}
      >
        <div className={styles.face + " " + styles.front}>
          <div className={styles.label}>{frontLabel}</div>
        </div>
        <div className={styles.face + " " + styles.back}>
          <div className={styles.label}>{frontLabel === "HEADS" ? "TAILS" : "HEADS"}</div>
        </div>
      </motion.div>
    </div>
  );
};

export default Coin;
