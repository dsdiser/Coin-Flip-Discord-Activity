import { Hono } from 'hono';
import { apiApp } from './web-server';
import { WebSocketApp } from './websocket-server';

const APP = new Hono()
  .route('/api/token', apiApp)
  .route('/ping', apiApp)
  .route('/ws', WebSocketApp);
console.log('Started webserver and websocket server');
export default APP;
export type appType = typeof APP;
