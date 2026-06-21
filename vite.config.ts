import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  root: './frontend',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve('./frontend/src'),
    },
  },
  build: {
    outDir: './dist', // relative to the root config ('./frontend'), resulting in './frontend/dist'
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true
      }
    }
  }
});
