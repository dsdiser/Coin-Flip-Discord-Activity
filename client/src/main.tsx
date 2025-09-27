// filepath: client/src/main.tsx
import React, { useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles/global.css";
import appStyles from "./styles/App.module.css";
import coinStyles from "./styles/Coin.module.css";
import { DiscordContextProvider, useDiscordSdk } from "./hooks/useDiscordSdk";
import DebugOverlay from "./components/DebugOverlay";

const App: React.FC = () => {
  return (
    <DiscordContextProvider authenticate={true} scope={["identify", "guilds", "guilds.members.read"]}>
      <CoinFlipApp />
    </DiscordContextProvider>
  );
};

type Result = 'heads' | 'tails';

function CoinFlipApp() {
  const { user, status, authenticated, accessToken, auth, error } = useDiscordSdk();
  const userName = user?.username ?? null;
  const [isFlipping, setIsFlipping] = useState(false);
  const [lastResult, setLastResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<Array<{ result: Result; timestamp: number }>>([]);
  const coinRef = useRef<HTMLDivElement | null>(null);

  function flipCoin() {
    if (!user || isFlipping) return;
    const result: Result = Math.random() < 0.5 ? 'heads' : 'tails';
    setIsFlipping(true);

    if (coinRef.current) {
      const spins = 4;
      const base = 360 * spins;
      const offset = result === 'heads' ? 0 : 180;
      const total = base + offset;
      coinRef.current.style.setProperty('--flip-rotation', `${total}deg`);
      coinRef.current.classList.remove(coinStyles.flipEnding);

      // finalize function used by both event listeners and fallback
      let fallback: number | undefined;
      function finalize(ev?: AnimationEvent | TransitionEvent) {
        // optional checks: if event exists, make sure it's the right one
        if (ev) {
          if (ev.type === 'animationend') {
            const animEv = ev as AnimationEvent;
            // our animation is named 'coin-flip' (or earlier 'coin-wobble'); accept either
            if (animEv.animationName && !(animEv.animationName === 'coin-flip' || animEv.animationName === 'coin-wobble')) return;
          }
          if (ev.type === 'transitionend') {
            const transEv = ev as TransitionEvent & { propertyName?: string };
            if (transEv.propertyName && transEv.propertyName !== 'transform') return;
          }
        }

        setLastResult(result);
        setHistory((h) => [{ result, timestamp: Date.now() }, ...h]);
        setIsFlipping(false);
        if (coinRef.current) {
          coinRef.current.classList.remove(coinStyles.flipping);
          coinRef.current.classList.add(coinStyles.flipEnding);
          coinRef.current.removeEventListener('animationend', wrapped as any);
          coinRef.current.removeEventListener('transitionend', wrapped as any);
        }
        if (fallback) clearTimeout(fallback);
      }

      // wrapper clears fallback then delegates to finalize
      function wrapped(ev?: AnimationEvent | TransitionEvent) {
        if (fallback) clearTimeout(fallback);
        return finalize(ev);
      }

      // attach listeners once; remove previous listeners for safety
      coinRef.current.removeEventListener('animationend', wrapped as any);
      coinRef.current.removeEventListener('transitionend', wrapped as any);
      coinRef.current.addEventListener('animationend', wrapped as any, { once: true } as any);
      coinRef.current.addEventListener('transitionend', wrapped as any, { once: true } as any);

      // start the animation by toggling class
      // force reflow
      coinRef.current.offsetWidth;
      coinRef.current.classList.add(coinStyles.flipping);

      // fallback timeout in case events don't fire
      fallback = window.setTimeout(() => {
        wrapped();
      }, 1400);
    }
  }
  if (!user){
    return (<div>Missing user object</div>)
  }
  return (
    <div className={appStyles.app}>
      <DebugOverlay
        status={status}
        authenticated={authenticated}
        accessToken={accessToken}
        error={error}
        user={user}
        auth={auth}
      />
      <h1>Coin Flip</h1>
        <div className={appStyles.player}>
          <div>Joined as <strong>{userName}</strong></div>
          <div className={coinStyles.coinArea}>
            <div className={coinStyles.coinContainer}>
              <div className={coinStyles.coin} ref={coinRef} role="img" aria-label="coin">
                <div className={`${coinStyles.face} ${coinStyles.heads}`} aria-hidden>
                  <svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="#ffb300" />
                    <text x="50%" y="55%" textAnchor="middle" fontSize="10" fontWeight="700" fill="#5a3a00">H</text>
                  </svg>
                </div>
                <div className={`${coinStyles.face} ${coinStyles.tails}`} aria-hidden>
                  <svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="#e0e0e0" />
                    <text x="50%" y="55%" textAnchor="middle" fontSize="10" fontWeight="700" fill="#333">T</text>
                  </svg>
                </div>
              </div>
            </div>

            <div className={appStyles.controls}>
                <button onClick={flipCoin} disabled={isFlipping} aria-disabled={isFlipping}>
                {isFlipping ? 'Flipping...' : 'Flip Coin'}
              </button>
                <div className={appStyles.result} aria-live="polite">
                {lastResult ? `Last: ${lastResult.toUpperCase()}` : 'No flips yet'}
              </div>
            </div>
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
  );
}

const root = ReactDOM.createRoot(document.getElementById("app")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
