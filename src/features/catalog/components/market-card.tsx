import { NftCard } from '@/components/nft/nft-card'
import { FavoriteButton } from '@/features/favorites/components/favorite-button'
import type { NftSummary } from '@/types'

/** Card do mercado: o NftCard base + botão de favoritar. */
export function MarketCard({ nft, priority }: { nft: NftSummary; priority?: boolean }) {
  return (
    <NftCard
      nft={nft}
      priority={priority}
      overlay={<FavoriteButton nftId={nft.id} name={nft.name} variant="overlay" />}
    />
  )
}
