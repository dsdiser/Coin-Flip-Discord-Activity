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
    },
    allowedHosts: ['license-proposal-witness-hydrocodone.trycloudflare.com', 'localhost'],
    hmr: {
      clientPort: 443,
    },
  },
});
