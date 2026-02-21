import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Use relative paths for Electron
  base: './',

  // Build configuration
  build: {
    outDir: 'dist',
    // Generate sourcemaps for debugging
    sourcemap: true,
    // Optimize for Electron
    target: 'es2022',
    // Smaller chunks for faster loading
    chunkSizeWarningLimit: 1000,
  },

  // Server configuration
  server: {
    port: 5173,
    strictPort: false,  // Will use next available port if 5173 is busy
    // Allow Electron to connect
    cors: true,
  },

  // Optimizations
  optimizeDeps: {
    // Pre-bundle these for faster dev startup
    include: ['react', 'react-dom', 'leaflet'],
  },
})
