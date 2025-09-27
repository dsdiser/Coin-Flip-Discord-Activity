import React, { useState } from 'react';
import styles from "../styles/DebugOverlay.module.css";

export default function DebugOverlay(props: {
  status: string;
  authenticated: boolean;
  accessToken?: string | null;
  error?: Error | null;
  user: any;
  auth: any;
}){
  const [open, setOpen] = useState(false);
  return (
    <div aria-hidden={!open}>
      <button
        className={styles.debugToggle}
        aria-expanded={open}
        aria-controls="debug-panel"
        onClick={() => setOpen((s) => !s)}
        title={open ? 'Hide debug' : 'Show debug'}
      >
        {open ? '\u00d7' : 'Debug'}
      </button>

      <aside id="debug-panel" className={`${styles.debugPanel} ${open ? styles.open : ''}`} role="region" aria-label="Debug information">
        <div className={styles.debugPanelInner}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <strong>Debug</strong>
            <button className={styles.debugClose} onClick={() => setOpen(false)} aria-label="Close debug panel">Close</button>
          </div>
          <div>Status: <strong>{props.status}</strong></div>
          <div>Authenticated: <strong>{String(props.authenticated)}</strong></div>
          <div>Access Token: <strong>{props.accessToken ? `${props.accessToken.slice(0,8)}...` : 'none'}</strong></div>
          <div>Error: <strong>{props.error ? props.error.message : 'none'}</strong></div>
          <div style={{marginTop: 8}}>
            User:
            <pre className={styles.debugPre}>
              {props.user ? JSON.stringify(props.user, null, 2) : 'no user'}
            </pre>
          </div>
          <div style={{marginTop: 8}}>{props.auth ? JSON.stringify(props.auth) : 'noauth'}</div>
        </div>
      </aside>
    </div>
  );
}
