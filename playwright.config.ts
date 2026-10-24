import { defineConfig, devices } from '@playwright/test'

const PORT = 5173

// Larguras de avaliação do desafio: 1440 / 768 / 390, todas em Chromium.
export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Paralelismo limitado: com muitos navegadores ao mesmo tempo, a própria máquina vira o gargalo
  // (requisições passam do timeout de 8s e o teste mede a carga, não o app).
  workers: process.env.CI ? 2 : 4,
  reporter: [['html', { open: 'never' }], ['list']],
  // Regressão visual: baselines versionadas em e2e/visual/<spec>/<nome>-<projeto>-<plataforma>.png.
  // A plataforma faz parte do nome porque a renderização de fontes muda entre Windows/macOS/Linux.
  snapshotPathTemplate: '{testDir}/../visual/{testFileName}/{arg}-{projectName}-{platform}{ext}',
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      // CSS só para a captura: a tab bar fixa do mobile não cobre o conteúdo na imagem de página inteira.
      stylePath: './e2e/visual/screenshot.css',
      // Tolerância absoluta (não %): em captura de página inteira, 1% seriam ~30 mil pixels e um
      // botão deslocado passaria despercebido. 100 pixels cobrem só ruído de antialiasing.
      maxDiffPixels: 100,
    },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } },
      // Contratos REST não dependem do viewport: rodam só no desktop.
      testIgnore: /data-layer/,
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
      testIgnore: /data-layer/,
    },
  ],
  webServer: {
    // Build de produção + preview: rápido, determinístico e igual ao que vai para o deploy.
    // (Se já houver um `pnpm dev` na porta, ele é reaproveitado — útil enquanto se desenvolve.)
    command: `pnpm exec vite build && pnpm exec vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
