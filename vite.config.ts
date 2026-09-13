import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { darkTheme } from './config/postcss-dark-theme'
import { solidSurface } from './config/postcss-solid-surface'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Keep in sync with compilerOptions.paths in tsconfig.app.json.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
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
