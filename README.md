# Coin Flip — Discord Activity

Multiplayer lobby that runs as a Discord Activity so you can flip coins together inside Discord.

## Goals

- Multiplayer lobby for joining a coin flip session
- Real-time flips resolved in the activity or on the webpage

## Dependencies

Client (UI):

- React - Typescript
- @discord/embedded-app-sdk
- Vite (dev)
- ojs (for background animation shader)
- Framer Motion (for coin animation)
- random.js (prng)

Server:

- Express
- dotenv (for simple env config)
- node-fetch

## Quick start (development)

Open two terminals and run the client and server (if you want the server):

Client (from repository root):

```cmd
cd client
npm install
npm run dev
```

Server:

```cmd
cd server
npm install
npm run dev
```

## Productionizing

Use .env and .env.production to set environment variables for the server and client.

The client uses the Embedded App SDK to run as an Activity inside Discord.
