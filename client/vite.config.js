import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';
import viteDevServer from './vite-dev-server';

// https://vitejs.dev/config/
export default defineConfig({
  envDir: '../',
  plugins: [
    react(),
    cloudflare(),
    viteDevServer({
      cloudflare: false,
      watch: ['../server', './wrangler.jsonc'],
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        secure: false,
      },
      '/ping': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        secure: false,
      },
      // Proxy websocket connections if client tries to connect to /ws
      '/ws': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        secure: false,
      },
    },
    allowedHosts: ['localhost', 'household-pickup-cam-vice.trycloudflare.com'],
    hmr: {
      host: 'localhost',
    },
  },
});
