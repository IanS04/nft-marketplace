import { defineConfig } from '@playwright/test'
import base from './playwright.config'

/**
 * Mesma suíte, rodando contra o site PUBLICADO (sem subir servidor local).
 * Uso: pnpm test:e2e:deploy   ·   outra URL: E2E_BASE_URL=https://… pnpm test:e2e:deploy
 */
const baseURL = process.env.E2E_BASE_URL ?? 'https://nft-marketplace-drab-chi.vercel.app'

export default defineConfig({
  ...base,
  webServer: undefined,
  use: { ...base.use, baseURL },
  // A rede real até a Vercel é mais lenta que o preview local.
  timeout: 45_000,
})
