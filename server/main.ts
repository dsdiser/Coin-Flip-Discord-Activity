import dotenv from 'dotenv';
// Load environment from repo root
dotenv.config({ path: '../.env' });

// Import servers to run them in-process. Both modules start their servers
// during module initialization (they call listen / create server at top-level),
// so simply importing them is sufficient for local development.
import './webserver';
import './websocket-server';

console.log('Started webserver and websocket server in-process');

function shutdown() {
  console.log('Shutting down servers...');
  // If the server modules expose explicit shutdown hooks in the future,
  // call them here. For now, just exit the process which will close sockets.
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
