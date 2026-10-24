import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEthWithUnit } from '@/lib/money'
import type { NftSummary } from '@/types'
import { NftImage } from './nft-image'

const CARD_SIZES = '(min-width: 1024px) 250px, (min-width: 768px) 30vw, 45vw'

interface NftCardProps {
  nft: NftSummary
  priority?: boolean
  /** Ação sobre a imagem (ex.: favoritar). Fica acima do link que cobre o card. */
  overlay?: ReactNode
}

export function NftCard({ nft, priority, overlay }: NftCardProps) {
  return (
    // O link "estica" sobre o card inteiro (after:inset-0); o anel de foco fica no card.
    <article className="group relative flex h-full flex-col gap-2 rounded-lg bg-card p-3 transition-colors hover:bg-card-elevated has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-secondary">
        <NftImage
          image={nft.image}
          sizes={CARD_SIZES}
          priority={priority}
          className="transition-transform duration-300 group-hover:scale-105"
        />
        {nft.rarity === 'raro' && (
          <span className="absolute left-0 top-0 rounded-br-lg bg-primary px-3 py-1 text-micro font-bold text-primary-foreground">
            RARO
          </span>
        )}
        {overlay && <div className="absolute right-2 top-2 z-10">{overlay}</div>}
      </div>
      <h3 className="truncate pt-1 text-body">
        <Link
          to="/nfts/$nftId"
          params={{ nftId: nft.id }}
          className="after:absolute after:inset-0 after:rounded-lg focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          {nft.name}
        </Link>
      </h3>
      <p className="flex flex-wrap items-baseline gap-x-2 text-body font-bold text-primary">
        <span>{formatEthWithUnit(nft.price)}</span>
        {nft.compareAtPrice && (
          <s className="font-normal text-muted-foreground">
            <span className="sr-only">Preço anterior: </span>
            {formatEthWithUnit(nft.compareAtPrice)}
          </s>
        )}
      </p>
    </article>
  )
}

/** Mesmas dimensões do NftCard: nada se mexe quando os dados chegam. */
export function NftCardSkeleton() {
  return (
    <div className="flex h-full flex-col gap-2 rounded-lg bg-card p-3">
      <Skeleton className="aspect-square w-full" />
      <Skeleton className="mt-1 h-5 w-3/4 rounded-sm" />
      <Skeleton className="h-5 w-1/3 rounded-sm" />
    </div>
  )
}
