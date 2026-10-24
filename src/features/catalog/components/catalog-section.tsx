import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Loader2, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { announce } from '@/components/feedback/announcer'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { NftCardSkeleton } from '@/components/nft/nft-card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { NFT_PAGE_SIZE, NFT_TABS } from '@/schemas/nft'
import type { PageInfo } from '@/types'
import { CATALOG_ANCHOR, useCatalogSearch } from '../hooks/use-catalog-search'
import { useNftList } from '../hooks/use-nft-list'
import { TAB_LABEL } from '../labels'
import { CatalogFilters } from './catalog-filters'
import { FeaturedCard } from './featured-card'
import { FiltersSheet } from './filters-sheet'
import { MarketCard } from './market-card'
import { SortSelect } from './sort-select'

export function CatalogSection() {
  return (
    <section id={CATALOG_ANCHOR} aria-labelledby="catalog-title" className="scroll-mt-20">
      <h2 id="catalog-title" className="sr-only">Catálogo de NFTs</h2>
      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
        <aside aria-label="Filtros do catálogo" className="hidden space-y-6 lg:block">
          <div className="rounded-lg bg-card p-4">
            <CatalogFilters />
          </div>
          <FeaturedCard />
        </aside>
        <div className="min-w-0 space-y-5">
          <CatalogToolbar />
          <ActiveFiltersSummary />
          <CatalogResults />
        </div>
      </div>
    </section>
  )
}

function CatalogToolbar() {
  const { search } = useCatalogSearch()
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <nav aria-label="Seções do catálogo" className="-mx-1 overflow-x-auto px-1">
        <ul className="flex gap-5">
          {NFT_TABS.map((tab) => {
            const active = search.tab === tab
            return (
              <li key={tab}>
                <Link
                  from="/"
                  to="/"
                  search={(prev) => ({ ...prev, tab, page: 1 })}
                  resetScroll={false}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'block whitespace-nowrap border-b-2 pb-1 text-body transition-colors',
                    active ? 'border-primary font-bold text-primary' : 'border-transparent text-foreground hover:text-primary',
                  )}
                >
                  {TAB_LABEL[tab]}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="hidden items-center gap-2 md:flex">
        <div className="lg:hidden">
          <FiltersSheet
            side="right"
            trigger={
              <Button variant="outline" size="sm" className="text-body">
                <SlidersHorizontal aria-hidden="true" /> Filtros
              </Button>
            }
          />
        </div>
        <SortSelect />
      </div>
    </div>
  )
}

/** Busca e filtros ativos ficam visíveis (e removíveis) acima da grade. */
function ActiveFiltersSummary() {
  const { search, setFilters, clearFilters, hasActiveFilters } = useCatalogSearch()
  const { data } = useNftList()
  if (!hasActiveFilters) return null

  return (
    <div className="flex flex-wrap items-center gap-2 text-body">
      {data && (
        <span className="text-muted-foreground" data-testid="results-count">
          {data.pageInfo.total} resultado{data.pageInfo.total === 1 ? '' : 's'}
        </span>
      )}
      {search.q && (
        <Chip onRemove={() => void setFilters({ q: undefined })} label={`Remover busca “${search.q}”`}>
          Busca: “{search.q}”
        </Chip>
      )}
      <Button variant="link" size="sm" className="h-auto px-0 text-body" onClick={() => void clearFilters()}>
        Limpar filtros
      </Button>
    </div>
  )
}

function Chip({ children, onRemove, label }: { children: ReactNode; onRemove: () => void; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/60 py-0.5 pl-3 pr-1 text-primary">
      {children}
      <button type="button" onClick={onRemove} aria-label={label} className="rounded-full p-0.5 hover:bg-primary/15">
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </span>
  )
}

function CatalogResults() {
  const { search, hasActiveFilters, clearFilters, goToPage } = useCatalogSearch()
  const list = useNftList()
  const { data, isPlaceholderData } = list

  // Anuncia o resultado só quando os dados da URL atual chegam (não os mantidos da página anterior).
  useEffect(() => {
    if (!data || isPlaceholderData) return
    const { total } = data.pageInfo
    announce(total === 0 ? 'Nenhum NFT encontrado.' : `${total} NFT${total === 1 ? '' : 's'} encontrado${total === 1 ? '' : 's'}.`)
  }, [data, isPlaceholderData])

  // Página além do fim (link antigo, filtro que reduziu o total) → última página válida.
  const totalPages = data?.pageInfo.totalPages
  useEffect(() => {
    if (totalPages !== undefined && !isPlaceholderData && search.page > totalPages) {
      void goToPage(totalPages, { replace: true })
    }
  }, [totalPages, isPlaceholderData, search.page, goToPage])

  if (list.isPending) {
    return (
      <div aria-label="Carregando NFTs">
        <CardGrid loading>
          {Array.from({ length: NFT_PAGE_SIZE }, (_, i) => <NftCardSkeleton key={i} />)}
        </CardGrid>
      </div>
    )
  }

  if (list.isError) {
    return (
      <ErrorState
        title="Não foi possível carregar os NFTs"
        error={list.error}
        onRetry={() => void list.refetch()}
        retrying={list.isFetching}
      />
    )
  }

  if (list.data.items.length === 0) {
    return (
      <EmptyState
        title="Nenhum NFT encontrado"
        description={
          hasActiveFilters
            ? 'Tente outra busca ou remova alguns filtros.'
            : 'Ainda não há NFTs listados no mercado.'
        }
        action={hasActiveFilters && <Button onClick={() => void clearFilters()}>Limpar filtros</Button>}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        {list.isFetching && (
          <p role="status" className="absolute -top-6 right-0 flex items-center gap-1 text-micro text-muted-foreground">
            <Loader2 className="size-3 animate-spin" aria-hidden="true" /> Atualizando…
          </p>
        )}
        <CardGrid busy={isPlaceholderData}>
          {list.data.items.map((nft, index) => (
            <MarketCard key={nft.id} nft={nft} priority={index < 3 && search.page === 1} />
          ))}
        </CardGrid>
      </div>
      <CatalogPagination pageInfo={list.data.pageInfo} />
    </div>
  )
}

function CardGrid({ children, busy = false, loading = false }: { children: ReactNode[]; busy?: boolean; loading?: boolean }) {
  return (
    <ul
      data-testid={loading ? 'nft-grid-loading' : 'nft-grid'}
      aria-busy={busy || loading}
      className={cn(
        'grid grid-cols-2 gap-3 transition-opacity md:grid-cols-3 md:gap-5',
        busy && 'opacity-60',
      )}
    >
      {children.map((child, i) => (
        // Mobile: segunda coluna deslocada para baixo, como no Figma.
        <li key={i} className="max-md:even:mt-10">{child}</li>
      ))}
    </ul>
  )
}

/** Janela de até 5 páginas centrada na atual. */
function pageWindow(page: number, totalPages: number): number[] {
  const size = Math.min(5, totalPages)
  const start = Math.min(Math.max(1, page - 2), totalPages - size + 1)
  return Array.from({ length: size }, (_, i) => start + i)
}

function CatalogPagination({ pageInfo }: { pageInfo: PageInfo }) {
  const { page, totalPages } = pageInfo
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Paginação do catálogo" className="flex justify-center">
      <ul className="flex items-center gap-2">
        {page > 1 && (
          <li><PageLink page={page - 1} label="Página anterior"><ChevronLeft className="size-4" aria-hidden="true" /></PageLink></li>
        )}
        {pageWindow(page, totalPages).map((n) => (
          <li key={n}><PageLink page={n} current={n === page}>{n}</PageLink></li>
        ))}
        {page < totalPages && (
          <li><PageLink page={page + 1} label="Próxima página"><ChevronRight className="size-4" aria-hidden="true" /></PageLink></li>
        )}
      </ul>
    </nav>
  )
}

function PageLink({ page, current, label, children }: { page: number; current?: boolean; label?: string; children: ReactNode }) {
  return (
    <Link
      from="/"
      to="/"
      search={(prev) => ({ ...prev, page })}
      hash={CATALOG_ANCHOR}
      resetScroll={false}
      aria-current={current ? 'page' : undefined}
      aria-label={label ?? `Página ${page}`}
      className={cn(
        'flex size-8 items-center justify-center rounded-sm text-body transition-colors',
        current ? 'bg-primary font-bold text-primary-foreground' : 'text-foreground hover:bg-secondary',
      )}
    >
      {children}
    </Link>
  )
}
