import React from 'react';
import styles from "../styles/LoadingScreen.module.css";

const LoadingScreen: React.FC = () => {
  return (
    <div className={styles.loadingScreen} role="status" aria-live="polite">
      <div className={styles.loadingEllipsis}>Loading<span className={styles.dot}>.</span><span className={styles.dot}>.</span><span className={styles.dot}>.</span></div>
    </div>
  );
};

export default LoadingScreen;
