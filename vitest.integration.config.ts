import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__integration__/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', '.next/**'],
    env: {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/solvesk_test',
      SKIP_ENV_VALIDATION: 'true',
      NEXTAUTH_SECRET: 'test-secret-for-integration-tests',
    },
    fileParallelism: false,
    sequence: { concurrent: false },
    globalSetup: ['src/__integration__/global-setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
