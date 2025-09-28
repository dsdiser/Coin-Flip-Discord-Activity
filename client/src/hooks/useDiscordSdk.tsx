import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { DiscordSDK } from "@discord/embedded-app-sdk";
import LoadingScreen from "../components/loading-screen/LoadingScreen";
import { OAuthScopes } from "@discord/embedded-app-sdk/output/schema/types";

export enum Status {
  Idle = "idle",
  Ready = "ready",
  Authenticating = "authenticating",
  Authenticated = "authenticated",
  Error = "error",
}

const MOCK_DISCORD_CONTEXT_VALUE: DiscordContextValue = {
  discordSdk: undefined,
  accessToken: null,
  authenticated: false,
  user: null,
  auth: undefined,
  status: Status.Error,
  error: new Error("Discord SDK not initialized"),
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator?: string;
  avatar?: string | null;
  global_name?: string | null;
}


interface DiscordContextValue {
  discordSdk?: any;
  accessToken?: string | null;
  authenticated: boolean;
  user: DiscordUser | null;
  auth?: ReturnType<typeof DiscordSDK.prototype.commands.authenticate>;
  status: Status;
  error?: Error | null;
}

const DiscordContext = createContext<DiscordContextValue | undefined>(
  undefined
);

interface ProviderProps {
  children: ReactNode;
  authenticate?: boolean;
  scope?: OAuthScopes[];
  loadingScreen?: ReactNode;
}

export const DiscordContextProvider: React.FC<ProviderProps> = ({
  children,
  authenticate = false,
  scope = ["identify", "guilds"],
  loadingScreen = <LoadingScreen />,
}) => {
  const clientId = (import.meta as any).env?.VITE_DISCORD_CLIENT_ID;
  const sdkRef = useRef<DiscordSDK | undefined>(undefined);
  const [status, setStatus] = useState<Status>(Status.Idle);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [auth, setAuth] = useState<any | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Lazily create SDK (so it can be mocked/tested easier)
  if (!sdkRef.current && clientId && status != Status.Error) {
    try {
      sdkRef.current = new DiscordSDK(clientId);
    } catch (err) {
      console.error("Failed to initialize Discord SDK", err);
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
          response_type: "code",
          state: "",
          prompt: "none",
          scope,
        });

        // Exchange the code for an access token at our server endpoint
        const res = await fetch("/api/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const body = await res.json();
        const token = body?.access_token;
        if (!token) {
          throw new Error("Token exchange failed");
        }
        if (!mounted) return;
        setAccessToken(token);

        // Authenticate the SDK with the returned access token so commands can be called
        const auth = await sdkRef.current.commands.authenticate({
          access_token: token,
        });
        if (!mounted) return;

        setAuthenticated(true);
        setUser(auth ? auth.user : null);
        setStatus(Status.Authenticated);
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
    user,
    auth,
    status,
    error,
  };

  if (status === Status.Authenticating && loadingScreen) {
    return <>{loadingScreen}</>;
  }

  return (
    <DiscordContext.Provider value={value}>{children}</DiscordContext.Provider>
  );
};

export function useDiscordSdk(): DiscordContextValue {
  const ctx = useContext(DiscordContext);
  if (!ctx) {
    console.warn("useDiscordSdk must be used within DiscordContextProvider");
    return MOCK_DISCORD_CONTEXT_VALUE;
  }
  return ctx;
}

export default useDiscordSdk;
