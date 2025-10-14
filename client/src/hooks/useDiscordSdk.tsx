import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { DiscordSDK } from '@discord/embedded-app-sdk';
import LoadingScreen from '../components/loading-screen/LoadingScreen';
import { OAuthScopes } from '@discord/embedded-app-sdk/output/schema/types';
import type { Auth, User } from '../types/user';
import { useAtom, useSetAtom } from 'jotai';
import { userAtom } from '../state/userAtoms';

export enum Status {
  Idle = 'idle',
  Ready = 'ready',
  Authenticating = 'authenticating',
  Authenticated = 'authenticated',
  Error = 'error',
}

const generateInstanceId = () => Math.random().toString(36).substring(2, 6);

interface DiscordContextValue {
  discordSdk?: any;
  accessToken?: string | null;
  authenticated: boolean;
  auth?: Auth;
  status: Status;
  error?: Error | null;
  instanceId: string;
}

const MOCK_DISCORD_CONTEXT_VALUE: DiscordContextValue = {
  discordSdk: undefined,
  accessToken: null,
  authenticated: false,
  auth: undefined,
  status: Status.Error,
  error: new Error('Discord SDK not initialized'),
  instanceId: generateInstanceId(),
};

const MOCK_USER: User = {
  id: generateInstanceId(),
  username: 'Unauthed User',
  discriminator: '0001',
  public_flags: 0,
};

const DiscordContext = createContext<DiscordContextValue | undefined>(undefined);

interface ProviderProps {
  children: ReactNode;
  authenticate: boolean; // Whether to perform auth to discord on mount. If not create mock user
  scope?: OAuthScopes[];
  loadingScreen?: ReactNode;
}

export const DiscordContextProvider: React.FC<ProviderProps> = ({
  children,
  authenticate = false,
  scope = ['identify', 'guilds'],
  loadingScreen = <LoadingScreen />,
}) => {
  const clientId = (import.meta as any).env?.VITE_DISCORD_CLIENT_ID;
  const sdkRef = useRef<DiscordSDK | undefined>(undefined);
  const [status, setStatus] = useState<Status>(Status.Idle);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const setUser = useSetAtom(userAtom);
  const [auth, setAuth] = useState<any | null>(null);
  const [error, setError] = useState<Error | null>(null);

  if (!sdkRef.current && clientId && status != Status.Error && authenticate) {
    try {
      sdkRef.current = new DiscordSDK(clientId);
    } catch (err) {
      console.error('Failed to initialize Discord SDK', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus(Status.Error);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!sdkRef.current) {
        return;
      }

      try {
        setStatus(Status.Idle);
        await sdkRef.current.ready();
        if (!mounted) return;
        setStatus(Status.Ready);

        if (!authenticate) return;

        setStatus(Status.Authenticating);

        // Request an authorization code from the Discord client
        const { code } = await sdkRef.current.commands.authorize({
          client_id: clientId,
          response_type: 'code',
          state: '',
          prompt: 'none',
          scope,
        });

        // Exchange the code for an access token at our server endpoint
        const res = await fetch('/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        const body = await res.json();
        const token = body?.access_token;
        if (!token) {
          throw new Error('Token exchange failed');
        }
        if (!mounted) return;
        setAccessToken(token);

        // Authenticate the SDK with the returned access token so commands can be called
        const auth = await sdkRef.current.commands.authenticate({
          access_token: token,
        });
        if (!mounted) return;

        setAuthenticated(true);
        setStatus(Status.Authenticated);
        setUser(auth.user);
        setAuth(auth);
      } catch (err: any) {
        if (!mounted) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setStatus(Status.Error);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [authenticate, scope]);

  const value: DiscordContextValue = {
    discordSdk: sdkRef.current,
    accessToken,
    authenticated,
    auth,
    status,
    error,
    instanceId: sdkRef.current?.instanceId || generateInstanceId(),
  };

  if (status === Status.Authenticating && loadingScreen) {
    return <>{loadingScreen}</>;
  }

  return <DiscordContext.Provider value={value}>{children}</DiscordContext.Provider>;
};

export function useDiscordSdk(): DiscordContextValue {
  const ctx = useContext(DiscordContext);
  const setUser = useSetAtom(userAtom);
  if (!ctx) {
    setUser(MOCK_USER);
    return MOCK_DISCORD_CONTEXT_VALUE;
  }
  return ctx;
}

export default useDiscordSdk;
