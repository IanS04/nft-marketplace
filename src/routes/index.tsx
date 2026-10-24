import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'
import { Container } from '@/components/layout/container'
import { CatalogSection } from '@/features/catalog/components/catalog-section'
import { Hero } from '@/features/catalog/components/hero'
import { HomeEditorial } from '@/features/catalog/components/home-editorial'
import { MobileCatalogBar } from '@/features/catalog/components/mobile-catalog-bar'
import { nftSearchSchema } from '@/schemas/nft'

export const Route = createFileRoute('/')({
  // Busca, filtros, ordenação e página vivem na URL (validados e tolerantes a valores inválidos).
  validateSearch: zodValidator(nftSearchSchema),
  search: {
    // Valores padrão saem da URL: "/" em vez de "/?tab=all&sort=recent&page=1…"
    middlewares: [stripSearchParams({ tab: 'all', sort: 'recent', page: 1, categories: [], networks: [] })],
  },
  component: HomePage,
})

function HomePage() {
  return (
    <Container className="space-y-6 py-4 md:space-y-12 md:py-10">
      <MobileCatalogBar />
      <Hero />
      <CatalogSection />
      <HomeEditorial />
    </Container>
  )
}
