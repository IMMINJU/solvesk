import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['tests/e2e/**', 'node_modules/**', '.next/**', 'src/__integration__/**'],
    env: {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/solvesk',
      SKIP_ENV_VALIDATION: 'true',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
