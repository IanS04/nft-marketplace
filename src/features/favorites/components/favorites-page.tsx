import { Link } from '@tanstack/react-router'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { NftCardSkeleton } from '@/components/nft/nft-card'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/features/account/components/section-header'
import { MarketCard } from '@/features/catalog/components/market-card'
import { cn } from '@/lib/cn'
import { useFavoriteNfts, useFavorites } from '../hooks/use-favorites'

const gridClass = 'grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-3'

/**
 * "Lista de interesse" (Figma): os NFTs favoritados. Desfavoritar pelo coração do card some da
 * lista na hora (atualização otimista) e volta se a API recusar (rollback do useToggleFavorite).
 */
export function FavoritesPage() {
  const nfts = useFavoriteNfts()
  const favorites = useFavorites()

  const header = <SectionHeader title="Lista de interesse" description="NFTs que você favoritou. Os preços se atualizam em tempo real." />

  if (nfts.isPending) {
    return (
      <>
        {header}
        <div aria-busy="true" aria-label="Carregando lista de interesse" className={gridClass}>
          {Array.from({ length: 3 }, (_, i) => <NftCardSkeleton key={i} />)}
        </div>
      </>
    )
  }
  if (nfts.isError) {
    return (
      <>
        {header}
        <ErrorState title="Não foi possível carregar sua lista" error={nfts.error} onRetry={() => void nfts.refetch()} retrying={nfts.isFetching} />
      </>
    )
  }

  // Os ids refletem a mudança otimista antes de a lista completa ser relida da API.
  const items = favorites.ready ? nfts.data.filter((nft) => favorites.ids.has(nft.id)) : nfts.data

  return (
    <>
      {header}
      {items.length === 0 ? (
        <EmptyState
          title="Sua lista de interesse está vazia"
          description="Toque no coração de um NFT para acompanhá-lo aqui."
          action={<Button asChild><Link to="/" hash="catalogo">Explorar o mercado</Link></Button>}
        />
      ) : (
        <ul className={cn(gridClass, nfts.isFetching && 'opacity-80')} aria-label="NFTs favoritados" data-testid="favorites-grid">
          {items.map((nft) => (
            <li key={nft.id}><MarketCard nft={nft} /></li>
          ))}
        </ul>
      )}
    </>
  )
}
