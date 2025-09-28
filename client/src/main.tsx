// filepath: client/src/main.tsx
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles/global.css";
import appStyles from "./components/App.module.css";
import { DiscordContextProvider, DiscordUser, useDiscordSdk } from "./hooks/useDiscordSdk";
import DebugOverlay from "./components/debug-overlay/DebugOverlay";
import Coin, { CoinResult } from "./components/coin/coin";
import BalatroEffect from "./components/balatro-background/balatro-effect";

const App: React.FC = () => {
  return (
    <DiscordContextProvider authenticate={true} scope={["identify", "guilds", "guilds.members.read"]}>
      <CoinFlipApp />
    </DiscordContextProvider>
  );
};

const CoinFlipApp: React.FC = () => {
  const { user: discordUser, status, authenticated, accessToken, auth, error } = useDiscordSdk();
  const [user, setUser] = useState<DiscordUser | null>(null);

  const [history, setHistory] = useState<Array<{ result: CoinResult; timestamp: number }>>([]);
  const userName = user?.username ?? null;

  useEffect(() => {
    if (discordUser) {
      setUser(discordUser);
    }
  }, [discordUser]);

  function onFlipResult(result: CoinResult) {
    setHistory((prev) => [...prev, { result: result as CoinResult, timestamp: Date.now() }]);
  }


  function setMockUser() {
    setUser({
      id: 'mock-id',
      username: 'MockUser',
    });
  }

  if (!user) {
    return (
      <div>
        <div>Missing user object</div>
        <button onClick={setMockUser}>Flip locally</button>
      </div>
    );
  }
  return (
    <>
      <div className={appStyles.app}>
        <DebugOverlay
          status={status}
          authenticated={authenticated}
          accessToken={accessToken}
          error={error}
          user={user}
          auth={auth}
        />
        <div className={appStyles.player}>
          <div>Joined as <strong>{userName}</strong></div>
          <div className={appStyles.coinArea}>
            <Coin onComplete={onFlipResult} />
          </div>

          {history.length > 0 && (
            <div className={appStyles.history}>
              <h3>History</h3>
              <ul>
                {history.map((h, idx) => (
                  <li key={h.timestamp + idx}>
                    {new Date(h.timestamp).toLocaleTimeString()} — {h.result}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>

  );
}

const root = ReactDOM.createRoot(document.getElementById("app")!);
root.render(
  <React.StrictMode>
    <BalatroEffect />
    <App />
  </React.StrictMode>
);
