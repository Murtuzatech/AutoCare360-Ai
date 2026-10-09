import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': '/src' } },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        // Stable vendor chunks cache well across deploys; charts, PDF and markdown load on demand via dynamic imports.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    globals: true,
    css: false,
    include: ['tests/**/*.test.{js,jsx,ts}'],
  },
})
