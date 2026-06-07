import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 13000,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:18080',
        changeOrigin: true,
      },
      '/swagger-ui': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:18080',
        changeOrigin: true,
      },
      '/v3/api-docs': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:18080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
