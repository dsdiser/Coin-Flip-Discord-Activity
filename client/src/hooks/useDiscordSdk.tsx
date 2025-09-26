import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { DiscordSDK } from "@discord/embedded-app-sdk";

export enum Status {
  Idle = "idle",
  Ready = "ready",
  Authenticating = "authenticating",
  Authenticated = "authenticated",
  Error = "error",
}

interface DiscordContextValue {
  discordSdk?: any;
  accessToken?: string | null;
  authenticated: boolean;
  session?: any;
  status: Status;
  error?: Error | null;
}

const DiscordContext = createContext<DiscordContextValue | undefined>(
  undefined
);

interface ProviderProps {
  children: ReactNode;
  authenticate?: boolean;
  scope?: string[];
  loadingScreen?: ReactNode;
}

export const DiscordContextProvider: React.FC<ProviderProps> = ({
  children,
  authenticate = false,
  scope = ["identify", "guilds"],
  loadingScreen = null,
}) => {
  const clientId = (import.meta as any).env?.VITE_DISCORD_CLIENT_ID;
  const sdkRef = useRef<any | undefined>(undefined);
  const [status, setStatus] = useState<Status>(Status.Idle);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);

  // Lazily create SDK (so it can be mocked/tested easier)
  if (!sdkRef.current && clientId) {
    sdkRef.current = new DiscordSDK(clientId);
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!sdkRef.current) {
        setError(new Error("Missing VITE_DISCORD_CLIENT_ID"));
        setStatus(Status.Error);
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
        setSession(auth?.session ?? null);
        setStatus(Status.Authenticated);
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
    session,
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

export function useDiscordSdk() {
  const ctx = useContext(DiscordContext);
  if (!ctx) {
    throw new Error("useDiscordSdk must be used within DiscordContextProvider");
  }
  return ctx;
}

export default useDiscordSdk;
