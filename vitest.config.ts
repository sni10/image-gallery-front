import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      // tests parse request URLs: without a base they'd be "undefined/…" (CI sets it, a local .env may not)
      env: { VITE_API_URL: 'http://localhost:8080' },
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      // used by `npm run test:ci` (CI uploads reports/ as an artifact); plain `vitest` doesn't collect coverage
      coverage: {
        provider: 'v8',
        include: ['src/**'],
        exclude: ['src/**/__tests__/**'],
        reporter: ['text-summary', 'html', 'cobertura'],
        reportsDirectory: 'reports/coverage',
      },
    },
  }),
)
