import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Split vendor chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'react-core': ['react', 'react-dom', 'react-router-dom'],
          'ui-libs': ['sweetalert2'],
        },
      },
    },
    // Enable source maps for production debugging
    sourcemap: false,
    // Target modern browsers
    target: 'es2020',
  },
  // Pre-bundle every runtime dependency at server start. If a dep (especially
  // react-icons' per-pack subpaths) is discovered lazily on first navigation,
  // Vite re-optimizes and does a FULL PAGE RELOAD mid-session — which shows up
  // as the page "randomly" refreshing itself. Listing them here bundles them
  // up front so navigation never triggers that reload.
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'sweetalert2',
      'react-select',
      'react-icons/fi',
      'laravel-echo',
      'pusher-js',
    ],
  },
})
