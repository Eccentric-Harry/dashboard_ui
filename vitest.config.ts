import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Tests only — the app build stays on vite.config.ts. The alias mirrors the one there so
// `@/` resolves the same way in a test as it does at runtime.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
