import React from 'react';
import styles from './Avatar.module.css';

interface AvatarProps {
  // URL of the avatar image
  url?: string;
}
/**
 * Avatar component to display user's avatar image.
 */
export const Avatar: React.FC<AvatarProps> = ({ url }) => {
  return (
    <div className={styles.avatar}>
      {url ? <img src={url} alt="User Avatar" /> : <div className={styles.placeholder} />}
    </div>
  );
};
