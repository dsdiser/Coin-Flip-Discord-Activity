import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';
import appStyles from './components/App.module.css';
import { DiscordContextProvider, useDiscordSdk } from './hooks/useDiscordSdk';
import { Provider as JotaiProvider, useAtom, useAtomValue, useSetAtom } from 'jotai';
import useWebsocket from './hooks/useWebsocket';
import DebugOverlay from './components/debug-overlay/DebugOverlay';
import Coin, { CoinResult } from './components/coin/Coin';
import BalatroBackground from './components/balatro-background/BalatroBackground';
import { spinAmountAtom } from './state/backgroundAtoms';
import { setRandomSeedAtom, seedAtom } from './state/coinAtoms';
import { userAtom } from './state/userAtoms';

const App: React.FC = () => {
  const [spinAmount, _setSpinAmount] = useAtom(spinAmountAtom);

  const inIframe = window.self !== window.top;
  const shouldAuth = inIframe; // Only authenticate if in an iframe (i.e. in Discord)

  return (
    <>
      <BalatroBackground
        color1="#476952"
        color2="#404040"
        color3="#142021"
        pixelFilter={500}
        spinRotation={spinAmount}
      />
      <DiscordContextProvider
        authenticateWithDiscord={shouldAuth}
        scope={['identify', 'guilds', 'guilds.members.read']}
      >
        <CoinFlipApp />
      </DiscordContextProvider>
    </>
  );
};

const CoinFlipApp: React.FC = () => {
  const { status, authenticated, accessToken, auth, error, instanceId } = useDiscordSdk();
  const [history, setHistory] = useState<Array<{ result: CoinResult; timestamp: number }>>([]);
  const user = useAtomValue(userAtom);
  const seed = useAtomValue(seedAtom);
  const setRandomSeed = useSetAtom(setRandomSeedAtom);
  const { send, connectionStatus } = useWebsocket(instanceId);

  function onFlipResult(result: CoinResult) {
    setRandomSeed();
    setHistory((prev) => [...prev, { result: result as CoinResult, timestamp: Date.now() }]);
  }

  const handleFlipSend = () => {
    if (!user) return;
    send({
      type: 'flip:start',
      seed: seed,
      timestamp: Date.now(),
    });
  };

  if (!user) {
    return (
      <div>
        <div>Missing user object</div>
        <button>Flip locally</button>
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
          websocketStatus={connectionStatus}
        />
        <div className={appStyles.player}>
          <div className={appStyles.coinArea}>
            <Coin onFlip={handleFlipSend} onComplete={onFlipResult} />
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
};

const root = ReactDOM.createRoot(document.getElementById('app')!);
root.render(
  <React.StrictMode>
    <JotaiProvider>
      <App />
    </JotaiProvider>
  </React.StrictMode>
);
