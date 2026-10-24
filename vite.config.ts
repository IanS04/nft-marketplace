import { fileURLToPath, URL } from 'node:url'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * Os mocks (MSW) são o "backend" desta demo: toda tela com dados depende deles. Por padrão o chunk
 * do MSW só começaria a baixar depois de o JS principal executar (import dinâmico). Este plugin
 * injeta <link rel="modulepreload"> desses chunks no index.html, para baixarem EM PARALELO ao app.
 * Só quando os mocks estão ligados (num build sem mocks, nada é pré-carregado).
 */
function preloadMocks(enabled: boolean): Plugin {
  const MOCK_ENTRIES = ['/src/mocks/browser.ts', '/src/mocks/runtime.ts']
  return {
    name: 'kurio:preload-mocks',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!enabled || !ctx.bundle) return
        const chunks = Object.values(ctx.bundle).filter((c) => c.type === 'chunk')
        const entryFiles = new Set(chunks.filter((c) => c.isEntry).map((c) => c.fileName))
        const files = new Set<string>()
        const visit = (fileName: string) => {
          if (files.has(fileName) || entryFiles.has(fileName)) return // o entry principal já está na página
          const chunk = chunks.find((c) => c.fileName === fileName)
          if (!chunk) return
          files.add(fileName)
          chunk.imports.forEach(visit)
        }
        chunks
          .filter((c) => MOCK_ENTRIES.some((entry) => c.facadeModuleId?.replace(/\\/g, '/').endsWith(entry)))
          .forEach((c) => visit(c.fileName))
        return [...files].map((file) => ({
          tag: 'link',
          attrs: { rel: 'modulepreload', crossorigin: '', href: `/${file}` },
          injectTo: 'head' as const,
        }))
      },
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    plugins: [
      // Precisa vir antes do react(): gera src/routeTree.gen.ts e divide o código por rota.
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      preloadMocks(env.VITE_ENABLE_MOCKS !== 'false'),
    ],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
  }
})
