import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig({
  envDir: '../',
  plugins: [react(), cloudflare()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      // Proxy websocket connections if client tries to connect to /ws
      '/ws': {
        target: 'ws://localhost:3002',
        ws: true,
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
