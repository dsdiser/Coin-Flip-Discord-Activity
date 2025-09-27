// filepath: client/src/main.tsx
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import "./style.css";
import { DiscordContextProvider, useDiscordSdk } from "./hooks/useDiscordSdk";

const App: React.FC = () => {
  return (
    <DiscordContextProvider authenticate={true} scope={["identify", "guilds", "guilds.members.read"]}>
      <CoinFlipApp />
    </DiscordContextProvider>
  );
};

type Result = 'heads' | 'tails';

function CoinFlipApp() {
  const { session } = useDiscordSdk();
  const [name, setName] = useState<string>('');
  const [user, setUser] = useState<string | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [lastResult, setLastResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<Array<{ result: Result; timestamp: number }>>([]);
  const coinRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Try to prefill the user from an authenticated session if available
    if ((session as any)?.user?.username) {
      setUser((session as any).user.username);
    }
  }, [session]);

  function userJoin() {
    setUser(name.trim() || 'Guest');
  }

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
      coinRef.current.classList.remove('flip-ending');

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
          coinRef.current.classList.remove('flipping');
          coinRef.current.classList.add('flip-ending');
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
      coinRef.current.classList.add('flipping');

      // fallback timeout in case events don't fire
      fallback = window.setTimeout(() => {
        wrapped();
      }, 1400);
    }
  }

  return (
    <div className="app">
      <h1>Coin Flip</h1>

      {!user ? (
        <div className="join">
          <input
            aria-label="Display name"
            placeholder="Enter your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button onClick={userJoin}>Join as {name.trim() || 'Guest'}</button>
        </div>
      ) : (
        <div className="player">
          <div>Joined as <strong>{user}</strong></div>
          <div className="coin-area">
            <div className="coin-container">
              <div className="coin" ref={coinRef} role="img" aria-label="coin">
                <div className="face heads" aria-hidden>
                  <svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="#ffb300" />
                    <text x="50%" y="55%" textAnchor="middle" fontSize="10" fontWeight="700" fill="#5a3a00">H</text>
                  </svg>
                </div>
                <div className="face tails" aria-hidden>
                  <svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="#e0e0e0" />
                    <text x="50%" y="55%" textAnchor="middle" fontSize="10" fontWeight="700" fill="#333">T</text>
                  </svg>
                </div>
              </div>
            </div>

            <div className="controls">
              <button onClick={flipCoin} disabled={isFlipping} aria-disabled={isFlipping}>
                {isFlipping ? 'Flipping...' : 'Flip Coin'}
              </button>
              <div className="result" aria-live="polite">
                {lastResult ? `Last: ${lastResult.toUpperCase()}` : 'No flips yet'}
              </div>
            </div>
          </div>

          {history.length > 0 && (
            <div className="history">
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
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("app")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
