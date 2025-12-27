import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
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
      external: ['crypto'],
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
  base: '/',
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    'global': 'window',
  },
  optimizeDeps: {
    exclude: ['bcryptjs'],
    // ADD THIS for better TypeScript handling:
    include: ['react', 'react-dom', 'react-router-dom']
  },
});