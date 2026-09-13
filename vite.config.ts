import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { solidSurface } from './config/postcss-solid-surface'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  css: {
    postcss: {
      plugins: [solidSurface()],
    },
  },
  build: {
    chunkSizeWarningLimit: 2000,
  },
})
