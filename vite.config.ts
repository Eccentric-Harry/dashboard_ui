import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { darkTheme } from './config/postcss-dark-theme'
import { solidSurface } from './config/postcss-solid-surface'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  css: {
    postcss: {
      // darkTheme first: its siblings must end up after solidSurface's so dark wins.
      plugins: [darkTheme(), solidSurface()],
    },
  },
  build: {
    chunkSizeWarningLimit: 2000,
  },
})
