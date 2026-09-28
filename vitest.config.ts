import path from 'path'
import { defineConfig } from 'vitest/config'

// Separate from vite.config.ts on purpose: the app config loads the router
// code-splitting and Tailwind plugins, none of which unit tests need.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
