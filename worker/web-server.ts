import { Hono } from 'hono';

export const apiApp = new Hono();

apiApp.post('/api/token', async (c: any) => {
  const ip = c.req.header('x-forwarded-for') || (c.req as any).conn?.remoteAddr || 'unknown';
  console.debug('Got request for /api/token for ' + ip);

  const body = await c.req.json();
  const code = body?.code || '';

  // Exchange the code for an access_token
  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: c.env.VITE_DISCORD_CLIENT_ID || '',
      client_secret: c.env.DISCORD_CLIENT_SECRET || '',
      grant_type: 'authorization_code',
      code,
    }),
  });

  const data = (await response.json()) as any;
  const access_token = (data && data.access_token) || null;

  return c.json({ access_token });
});

apiApp.get('/ping', (c) => {
  console.log('Received request for /ping');
  return c.text('pong');
});
