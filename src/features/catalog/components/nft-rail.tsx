import { useQuery } from '@tanstack/react-query'
import { useId } from 'react'
import { NftCardSkeleton } from '@/components/nft/nft-card'
import type { NftId, NftListQuery } from '@/types'
import { nftListQueryOptions } from '../api/queries'
import { MarketCard } from './market-card'

const POPULAR: NftListQuery = { tab: 'all', categories: [], networks: [], sort: 'popular', page: 1, pageSize: 6 }
const SIZE = 5

/** Vitrine horizontal ("Mais desta coleção", "Colecionadores também viram"). Falha aqui não é crítica: some. */
export function NftRail({ title, excludeId }: { title: string; excludeId?: NftId }) {
  const titleId = useId()
  const { data, isPending, isError } = useQuery(nftListQueryOptions(POPULAR))
  if (isError) return null
  const items = data?.items.filter((n) => n.id !== excludeId).slice(0, SIZE) ?? []

  return (
    <section aria-labelledby={titleId} className="space-y-4">
      <h2 id={titleId} className="text-title text-primary">{title}</h2>
      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0">
        {isPending
          ? Array.from({ length: SIZE }, (_, i) => (
              <li key={i} className="relative w-44 shrink-0 md:w-auto"><NftCardSkeleton /></li>
            ))
          : items.map((nft) => (
              <li key={nft.id} className="relative w-44 shrink-0 snap-start md:w-auto"><MarketCard nft={nft} /></li>
            ))}
      </ul>
    </section>
  )
}
