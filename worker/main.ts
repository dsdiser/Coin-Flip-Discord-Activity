import { Hono } from 'hono';
import { apiApp } from './web-server';
import { WebSocketApp } from './websocket-server';

const APP = new Hono()
  // Mount the sub-apps at the root so the routes defined inside them
  // (like `/api/token`, `/ping`, and `/ws`) resolve to the expected paths
  .route('/', apiApp)
  .route('/', WebSocketApp);
console.log('Started webserver and websocket server');
export default APP;
export type appType = typeof APP;
