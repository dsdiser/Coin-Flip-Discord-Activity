import React, { useCallback, useEffect } from 'react';
import styles from './Avatar.module.css';

interface AvatarProps {
  guildId: string; // Discord Guild ID to fetch guild-specific avatarS
  accessToken?: string | null; // Discord OAuth2 access token
  avatar?: string | null; // User's avatar hash from Discord
  userId: string; // User's Discord or randomized ID
}

/**
 * Avatar component to display user's avatar image.
 */
export const Avatar: React.FC<AvatarProps> = ({ guildId, accessToken, avatar, userId }) => {
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);

  const setDefaultAvatar = useCallback(() => {
    let avatarSrc = '';
    if (avatar) {
      avatarSrc = `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png?size=256`;
    } else {
      const defaultAvatarIndex = BigInt(userId) % 6n;
      avatarSrc = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png?size=256`;
    }
    setAvatarUrl(avatarSrc);
  }, [userId, avatar]);

  // TODO: This may need to be proxied via discord
  useEffect(() => {
    if (!accessToken) {
      setDefaultAvatar();
      return;
    }

    let avatarSrc = '';
    fetch(`https://discord.com/api/users/@me/guilds/${guildId}/member`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then((response) => {
        return response.json();
      })
      .then((guildsMembersRead) => {
        if (guildsMembersRead?.avatar) {
          avatarSrc = `https://cdn.discordapp.com/guilds/${guildId}/users/${userId}/avatars/${guildsMembersRead.avatar}.png?size=256`;
        } else {
          setDefaultAvatar();
        }
      })
      .catch((error) => {
        // fallback to default avatars
        setDefaultAvatar();
      });
  }, [guildId, accessToken, avatar, userId]);

  if (!avatarUrl) {
    return null;
  }

  return (
    <div className={styles.avatar}>
      <img
        src={avatarUrl}
        width="64"
        height="64"
        alt="User Avatar"
        draggable={false}
        className={styles.img}
      />
    </div>
  );
};
