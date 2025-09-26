
# Coin Flip — Discord Activity

Multiplayer lobby that runs as a Discord Activity so you can flip coins together inside Discord.

## Goals

- Multiplayer lobby for joining a coin flip session
- Real-time flips resolved in the activity
- Maybe threejs based implementation for flipping, we'll see.

## Dependencies

Client (UI):
- React - Typescript
- @discord/embedded-app-sdk
- Vite (dev)

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
npm start
```

The client uses the Embedded App SDK to run as an Activity inside Discord.



