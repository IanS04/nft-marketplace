import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { MapPin } from 'lucide-react'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { Container } from '@/components/layout/container'
import { NftImage } from '@/components/nft/nft-image'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEthWithUnit } from '@/lib/money'
import type { CreatorSummary } from '@/types'
import { creatorsQueryOptions } from '../api/queries'
import { CreatorAvatar } from './creator-avatar'

const gridClass = 'grid grid-cols-1 gap-5 sm:grid-cols-2'

export function CreatorsPage() {
  const creators = useQuery(creatorsQueryOptions())

  return (
    <Container className="space-y-6 py-6 md:py-10">
      <Breadcrumb className="hidden md:block" items={[{ label: 'Início', link: { to: '/' } }, { label: 'Criadores' }]} />
      <header className="max-w-2xl space-y-2">
        <h1 className="text-heading">Criadores</h1>
        <p className="text-muted-foreground">
          Quatro artistas assinam os modelos da coleção Kurio Apes. Conheça quem está por trás de cada arte e como cada um cria seus NFTs.
        </p>
      </header>

      {creators.isPending ? (
        <ul aria-busy="true" aria-label="Carregando criadores" className={gridClass}>
          {Array.from({ length: 4 }, (_, i) => <li key={i}><Skeleton className="h-[22rem] w-full" /></li>)}
        </ul>
      ) : creators.isError ? (
        <ErrorState title="Não foi possível carregar os criadores" error={creators.error} onRetry={() => void creators.refetch()} retrying={creators.isFetching} />
      ) : creators.data.length === 0 ? (
        <EmptyState title="Nenhum criador por aqui" description="Volte mais tarde para conhecer os artistas do mercado." />
      ) : (
        <ul className={gridClass} aria-label="Criadores" data-testid="creators-list">
          {creators.data.map((creator) => <li key={creator.id}><CreatorCard creator={creator} /></li>)}
        </ul>
      )}
    </Container>
  )
}

function CreatorCard({ creator }: { creator: CreatorSummary }) {
  return (
    // O link do nome "estica" sobre o card inteiro, como nos cards de NFT.
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg bg-card transition-colors hover:bg-card-elevated has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
      <div className="aspect-[16/9] overflow-hidden bg-secondary">
        <NftImage image={creator.artwork} sizes="(min-width: 640px) 45vw, 90vw" className="object-[50%_30%] transition-transform duration-300 group-hover:scale-105" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <CreatorAvatar name={creator.name} />
          <div className="min-w-0">
            <h2 className="text-title">
              <Link
                to="/creators/$creatorId"
                params={{ creatorId: creator.id }}
                className="after:absolute after:inset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                {creator.name}
              </Link>
            </h2>
            <p className="truncate text-micro text-muted-foreground">{creator.role} · {creator.handle}</p>
          </div>
        </div>
        <p className="text-body">{creator.tagline}</p>
        <p className="flex items-center gap-1 text-micro text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden="true" /> {creator.location}
        </p>
        <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-border pt-3 text-micro">
          <div><dt className="text-muted-foreground">NFTs</dt><dd className="font-bold">{creator.stats.nftCount}</dd></div>
          <div>
            <dt className="text-muted-foreground">A partir de</dt>
            <dd className="font-bold text-primary">{creator.stats.floorPrice ? formatEthWithUnit(creator.stats.floorPrice) : '—'}</dd>
          </div>
          <div><dt className="text-muted-foreground">Edições à venda</dt><dd className="font-bold">{creator.stats.editionsAvailable}</dd></div>
        </dl>
      </div>
    </article>
  )
}
