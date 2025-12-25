import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    rollupOptions: {
      external: ['crypto'], // Externalize crypto for browser
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    'global': 'window', // Fix global for browser
  },
  optimizeDeps: {
    exclude: ['bcryptjs'], // Exclude bcrypt from optimization
  },
});