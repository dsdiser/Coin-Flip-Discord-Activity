const metaVars = (import.meta as any).env;

export function getProxiedUrl(originalUrl: string): string {
  const isInIframe = window.self !== window.top;
  const url = new URL(originalUrl);
  // In discord iframe can only connect to a websocket that is in proxy
  // Instead of example.com/ws, you use <appid>.discordsays.com/.proxy/ws
  // Make sure the redirect is set up in application's activity URL mappings in dev console
  if (isInIframe) {
    return `${url.protocol}//${metaVars.VITE_DISCORD_CLIENT_ID}.discordsays.com/.proxy${url.pathname}${url.search}`;
  } else {
    return originalUrl;
  }
}
