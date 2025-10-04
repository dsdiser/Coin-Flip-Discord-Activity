import express from 'express';
import fetch from 'node-fetch';

const app = express();
const port = 3001;

// Allow express to parse JSON bodies
app.use(express.json());

app.post('/api/token', async (req, res) => {
  console.debug('Got request for /api/token for ' + req.ip);

  // Exchange the code for an access_token
  const response = await fetch(`https://discord.com/api/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.VITE_DISCORD_CLIENT_ID || '',
      client_secret: process.env.DISCORD_CLIENT_SECRET || '',
      grant_type: 'authorization_code',
      code: req.body.code || '',
    }),
  });

  // Retrieve the access_token from the response
  const { access_token } = (await response.json()) as { access_token: string };

  // Return the access_token to our client as { access_token: "..."}
  res.send({ access_token });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
