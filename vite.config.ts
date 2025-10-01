
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import os from 'node:os';

export default defineConfig({
  cacheDir: path.join(os.tmpdir(), 'vite-misan-cache'),
  plugins: [react()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      'figma:asset/62f6ba08acc1edb7f3b514d09860553db6f03b48.png': path.resolve(__dirname, './src/assets/62f6ba08acc1edb7f3b514d09860553db6f03b48.png'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'build',
    modulePreload: {
      polyfill: false,
    },
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'supabase-vendor';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }
          if (id.includes('node_modules/@radix-ui') || id.includes('node_modules/@floating-ui') || id.includes('node_modules/sonner')) {
            return 'ui-vendor';
          }
          if (id.includes('/components/AdminPage') || id.includes('\\components\\AdminPage')) {
            return 'admin';
          }
          if (id.includes('/components/ModalsContainer') || id.includes('\\components\\ModalsContainer')) {
            return 'modals';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
    watch: {
      ignored: ['**/legacy/**'],
    },
  },
});
