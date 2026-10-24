import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { NftImage } from '@/components/nft/nft-image'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEthWithUnit } from '@/lib/money'
import { featuredNftsQueryOptions } from '../api/queries'

/** "NFT em destaque / Oferta limitada": o destaque com preço riscado (ou o primeiro destaque). */
export function FeaturedCard() {
  const { data, isPending, isError } = useQuery(featuredNftsQueryOptions())
  const nft = data?.find((n) => n.compareAtPrice) ?? data?.[0]

  return (
    <section aria-labelledby="featured-title" className="overflow-hidden rounded-lg bg-card">
      <h2 id="featured-title" className="bg-band px-4 py-2 text-title text-primary">NFT EM DESTAQUE</h2>
      <p className="pt-3 text-center font-bold">OFERTA LIMITADA</p>
      <div className="p-3">
        {isPending ? (
          <div className="space-y-2">
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="h-5 w-3/4 rounded-sm" />
          </div>
        ) : isError || !nft ? (
          <p className="py-6 text-center text-muted-foreground">Destaque indisponível no momento.</p>
        ) : (
          <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="group block space-y-2 rounded-lg">
            <div className="aspect-square overflow-hidden rounded-lg">
              <NftImage image={nft.image} sizes="15rem" className="transition-transform duration-300 group-hover:scale-105" />
            </div>
            <p className="font-bold group-hover:text-primary">{nft.name}</p>
            <p className="flex flex-wrap gap-x-2 font-bold text-primary">
              {formatEthWithUnit(nft.price)}
              {nft.compareAtPrice && (
                <s className="font-normal text-muted-foreground">
                  <span className="sr-only">Preço anterior: </span>
                  {formatEthWithUnit(nft.compareAtPrice)}
                </s>
              )}
            </p>
          </Link>
        )}
      </div>
    </section>
  )
}
