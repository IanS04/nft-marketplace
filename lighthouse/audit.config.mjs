/**
 * Configuração versionada da auditoria Lighthouse (exigência do desafio).
 * - Páginas: início e detalhe do NFT.
 * - Perfis: mobile (padrão do Lighthouse: Moto G Power, 4G lento, CPU 4x) e desktop (preset oficial).
 * - 3 medições por página × perfil; o relatório usa a MEDIANA de cada categoria e métrica.
 * - Build de produção (vite preview) com o cenário PADRÃO dos mocks (MSW ligado, como na demo).
 */
export const AUDIT = {
  port: 4173,
  runs: 3,
  pages: [
    { id: 'inicio', path: '/' },
    { id: 'detalhe', path: '/nfts/emerald-ape-042' },
  ],
  formFactors: ['mobile', 'desktop'],
  categories: ['performance', 'accessibility', 'best-practices', 'seo'],
  /** Metas do desafio (score 0–100). */
  targets: { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 },
  /** Métricas registradas no resumo. */
  metrics: ['largest-contentful-paint', 'cumulative-layout-shift', 'total-blocking-time', 'first-contentful-paint', 'speed-index'],
  outDir: 'lighthouse/reports/latest',
}
