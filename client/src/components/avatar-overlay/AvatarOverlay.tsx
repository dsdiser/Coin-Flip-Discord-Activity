import React from 'react';
import styles from './AvatarOverlay.module.css';
import { Avatar } from '../avatar/Avatar';

type UserLike = {
  id: string;
  avatar?: string;
};

interface AvatarOverlayProps {
  users: UserLike[];
  guildId?: string;
  accessToken?: string | null;
  maxVisible?: number; // Optional max number of avatars to show
}

//  Renders a fixed footer across the bottom of the screen with evenly spaced avatars.
export const AvatarOverlay: React.FC<AvatarOverlayProps> = ({
  users,
  guildId,
  accessToken,
  maxVisible = 15,
}) => {
  const visible = React.useMemo(() => users.slice(0, maxVisible), [users, maxVisible]);

  if (!visible || visible.length === 0) return null;

  return (
    <footer className={styles.footer} aria-hidden={false}>
      <div className={styles.container}>
        {visible.map((u) => (
          <Avatar
            key={u.id}
            guildId={guildId}
            accessToken={accessToken}
            avatar={u.avatar}
            userId={u.id}
          />
        ))}
      </div>
    </footer>
  );
};

export default AvatarOverlay;
