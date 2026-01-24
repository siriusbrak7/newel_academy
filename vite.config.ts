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
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
    rollupOptions: {
      external: ['crypto'],
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'charts': ['chart.js', 'react-chartjs-2'],
          'ui': ['lucide-react', 'jspdf', 'jspdf-autotable']
        }
      }
    },
    emptyOutDir: true,
    assetsDir: 'assets',
    chunkSizeWarningLimit: 1000,
  },
  base: '/',
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    'global': 'window',
  },
  optimizeDeps: {
    exclude: ['bcryptjs'],
    include: ['react', 'react-dom', 'react-router-dom']
  },
});