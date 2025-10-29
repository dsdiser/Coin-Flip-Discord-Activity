import React, { useEffect, useState, useMemo } from 'react';
import styles from './AvatarOverlay.module.css';
import { Avatar } from '../avatar/Avatar';
import { DiscordSDK, Events } from '@discord/embedded-app-sdk';

type UserLike = {
  id: string;
  avatar?: string;
};
type ParticipantsUpdateEvent = {
  participants: {
    username: string;
    discriminator: string;
    id: string;
    bot: boolean;
    flags: number;
    avatar?: string | null;
    global_name?: string | null;
    avatar_decoration_data?: {
      asset: string;
      skuId?: string;
      expiresAt?: number;
    } | null;
    premium_type?: number | null;
    nickname?: string;
  }[];
};

interface AvatarOverlayProps {
  users: UserLike[];
  accessToken?: string | null;
  discordSdk?: DiscordSDK;
}

const MAX_VISIBLE_AVATARS_DESKTOP = 15;
const MAX_VISIBLE_AVATARS_TABLET = 10;
const MAX_VISIBLE_AVATARS_MOBILE = 6;

// Custom hook to track screen size
const useScreenSize = () => {
  const [screenSize, setScreenSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return 1024; // Default to desktop
  });
  useEffect(() => {
    const handleResize = () => {
      setScreenSize(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return screenSize;
};

//  Renders a fixed footer across the bottom of the screen with evenly spaced avatars.
export const AvatarOverlay: React.FC<AvatarOverlayProps> = ({ users, accessToken, discordSdk }) => {
  const screenWidth = useScreenSize();

  // Determine max avatars based on screen size
  const maxVisibleAvatars = useMemo(() => {
    if (screenWidth <= 480) return MAX_VISIBLE_AVATARS_MOBILE;
    if (screenWidth <= 768) return MAX_VISIBLE_AVATARS_TABLET;
    return MAX_VISIBLE_AVATARS_DESKTOP;
  }, [screenWidth]);

  const visible = useMemo(() => users.slice(0, maxVisibleAvatars), [users, maxVisibleAvatars]);
  const guildId = discordSdk?.guildId ?? undefined;

  // State to track which users are actively speaking
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!discordSdk) return;

    const updateActiveSpeaker = (event: ParticipantsUpdateEvent) => {
      // Extract speaking users from the participants data
      // The event contains participants with speaking status
      const currentlySpeaking = new Set<string>();
      event.participants.forEach((participant) => {
        // Check if participant is speaking and is in our visible users list
        if (participant.id) {
          const isVisible = visible.some((user) => user.id === participant.id);
          if (isVisible) {
            currentlySpeaking.add(participant.id);
          }
        }
      });

      // Only update state if there's a change
      setSpeakingUsers((prevSpeaking) => {
        if (
          prevSpeaking.size !== currentlySpeaking.size ||
          ![...prevSpeaking].every((id, _i) => currentlySpeaking.has(id))
        ) {
          return currentlySpeaking;
        }
        return prevSpeaking;
      });
    };
    discordSdk.subscribe(Events.ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE, updateActiveSpeaker);
    // Unsubscribe
    return () => {
      discordSdk.unsubscribe(Events.ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE, updateActiveSpeaker);
    };
  }, [discordSdk, accessToken, visible]);

  if (!visible || visible.length === 0) return null;

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        {visible.map((u) => (
          <Avatar
            key={u.id}
            guildId={guildId}
            accessToken={accessToken}
            avatar={u.avatar}
            userId={u.id}
            isSpeaking={speakingUsers.has(u.id)}
          />
        ))}
      </div>
    </footer>
  );
};

export default AvatarOverlay;
