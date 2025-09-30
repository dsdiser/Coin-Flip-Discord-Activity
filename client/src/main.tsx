// filepath: client/src/main.tsx
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles/global.css";
import appStyles from "./components/App.module.css";
import { DiscordContextProvider, DiscordUser, useDiscordSdk } from "./hooks/useDiscordSdk";
import { Provider as JotaiProvider, useAtom } from 'jotai';
import useWebsocket from './hooks/useWebsocket';
import { seedAtom } from './state/websocketAtoms';
import DebugOverlay from "./components/debug-overlay/DebugOverlay";
import Coin, { CoinResult } from "./components/coin/coin";
import BalatroBackground from "./components/balatro-background/BalatroBackground";

const App: React.FC = () => {
  const [spinAmount, setSpinAmount] = useState<number>(-2);

  const inIframe = window.self !== window.top;
  const shouldAuth = inIframe; // Only authenticate if in an iframe (i.e. in Discord)

  const setSpin = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSpinAmount(parseFloat(e.target.value));
  }

  return (
    <>
      <BalatroBackground color1="#476952" color2="#404040" color3="#142021" pixelFilter={500} spinRotation={spinAmount} />
      {/* <div>
        <label>Background Spin Rotation: </label>
        <input onChange={setSpin} type="number" value={spinAmount} />
      </div> */}
      <div>
        <DiscordContextProvider authenticate={shouldAuth} scope={["identify", "guilds", "guilds.members.read"]}>
          <CoinFlipApp />
        </DiscordContextProvider>
      </div>
    </>
  );
};

const CoinFlipApp: React.FC = () => {
  const { user: discordUser, status, authenticated, accessToken, auth, error } = useDiscordSdk();
  const [user, setUser] = useState<DiscordUser | null>(null);

  const [history, setHistory] = useState<Array<{ result: CoinResult; timestamp: number }>>([]);
  const userName = user?.username ?? null;
  const { send } = useWebsocket('demo-room', 'ws://localhost:3002');
  const [, setSeed] = useAtom(seedAtom as any);

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
          <div style={{ marginTop: 8 }}>
            <label>Host actions: </label>
            <button onClick={() => {
              const seed = Math.floor(Math.random() * 1000000);
              setSeed(seed);
              send({ type: 'flip:start', roomId: 'demo-room', seed, from: user?.id, timestamp: Date.now() });
            }}>Flip (host)</button>
          </div>
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
    <JotaiProvider>
      <App />
    </JotaiProvider>
  </React.StrictMode>
);
