import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root,
  test: {
    environment: 'jsdom',
    globals: true,
    clearMocks: true,
    passWithNoTests: true,
    include: ['**/*.{test,spec}.{ts,tsx,js,jsx}'],
    exclude: ['**/.worktrees/**', '**/dist/**', '**/node_modules/**'],
  },
});
