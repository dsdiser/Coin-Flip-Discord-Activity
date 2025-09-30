import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  envDir: '../',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      // Proxy websocket connections if client tries to connect to /ws
      '/ws': {
        target: 'ws://localhost:3002',
        ws: true,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/ws/, ''),
      },
    },
    allowedHosts: ['localhost'],
    hmr: {
      host: 'localhost'
    },
  },
});
