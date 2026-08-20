import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  // Where the app is served from. Root of a domain is the default; a build
  // that will live in a SUBFOLDER must say so, e.g. VITE_BASE_PATH=/wifaq/,
  // otherwise index.html asks for /assets/... at the domain root, the server
  // has nothing there, and its 404 page comes back as HTML where the browser
  // expected a module script. Must end with a slash.
  base: loadEnv(mode, process.cwd(), '').VITE_BASE_PATH || '/',
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
}))
