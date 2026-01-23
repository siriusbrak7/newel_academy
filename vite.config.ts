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
          // Split vendor code
          'vendor': [
            'react',
            'react-dom',
            'react-router-dom'
          ],
          // Split supabase (only load when needed)
          'supabase': [
            '@supabase/supabase-js'
          ],
          // Split chart libraries
          'charts': [
            'chart.js',
            'react-chartjs-2'
          ],
          // Split UI libraries
          'ui': [
            'lucide-react',
            'jspdf',
            'jspdf-autotable'
          ]
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
    include: [
      'react',
      'react-dom',
      'react-router-dom'
    ]
  },
});