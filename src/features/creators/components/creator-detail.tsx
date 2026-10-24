import { Link } from '@tanstack/react-router'
import { MapPin } from 'lucide-react'
import { EmptyState } from '@/components/feedback/empty-state'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { Container } from '@/components/layout/container'
import { NftImage } from '@/components/nft/nft-image'
import { Skeleton } from '@/components/ui/skeleton'
import { MarketCard } from '@/features/catalog/components/market-card'
import { NETWORK_LABEL } from '@/features/catalog/labels'
import { formatDate } from '@/lib/date'
import { formatEthWithUnit } from '@/lib/money'
import type { Creator } from '@/types'
import { CreatorAvatar } from './creator-avatar'

export function CreatorDetail({ creator }: { creator: Creator }) {
  return (
    <Container className="space-y-10 py-6 md:py-10">
      <Breadcrumb
        className="hidden md:block"
        items={[{ label: 'Início', link: { to: '/' } }, { label: 'Criadores', link: { to: '/creators' } }, { label: creator.name }]}
      />

      <section aria-labelledby="creator-name" className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="aspect-square overflow-hidden rounded-xl bg-secondary">
          <NftImage image={creator.artwork} sizes="(min-width: 768px) 45vw, 100vw" priority />
        </div>
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <CreatorAvatar name={creator.name} className="size-16 text-title" />
            <div className="min-w-0">
              <h1 id="creator-name" className="text-heading">{creator.name}</h1>
              <p className="text-body text-muted-foreground">{creator.role} · {creator.handle}</p>
              <p className="flex items-center gap-1 text-micro text-muted-foreground">
                <MapPin className="size-3.5" aria-hidden="true" /> {creator.location} · no Kurio desde {formatDate(creator.memberSince)}
              </p>
            </div>
          </div>
          <p className="text-title font-normal text-primary">{creator.tagline}</p>
          <p className="text-body">{creator.bio}</p>

          <dl className="grid grid-cols-2 gap-3 rounded-lg bg-card p-4 text-body sm:grid-cols-3">
            <div><dt className="text-micro text-muted-foreground">Modelo</dt><dd className="font-bold">{creator.modelName}</dd></div>
            <div><dt className="text-micro text-muted-foreground">Rede preferida</dt><dd className="font-bold">{NETWORK_LABEL[creator.preferredNetwork]}</dd></div>
            <div><dt className="text-micro text-muted-foreground">Royalties</dt><dd className="font-bold">{creator.royaltyPercent}% nas revendas</dd></div>
            <div><dt className="text-micro text-muted-foreground">NFTs no mercado</dt><dd className="font-bold" data-testid="creator-nft-count">{creator.stats.nftCount}</dd></div>
            <div>
              <dt className="text-micro text-muted-foreground">A partir de</dt>
              <dd className="font-bold text-primary">{creator.stats.floorPrice ? formatEthWithUnit(creator.stats.floorPrice) : '—'}</dd>
            </div>
            <div><dt className="text-micro text-muted-foreground">Edições limitadas à venda</dt><dd className="font-bold">{creator.stats.editionsAvailable}</dd></div>
          </dl>

          <div className="space-y-2">
            <h2 className="text-body font-bold">Ferramentas</h2>
            <ul className="flex flex-wrap gap-2" aria-label="Ferramentas">
              {creator.tools.map((tool) => (
                <li key={tool} className="rounded-sm border border-primary/60 px-2 py-1 text-micro font-bold text-primary">{tool}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="process-title" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="process-title" className="text-title">Como {creator.name.split(' ')[0]} cria um NFT</h2>
          <Link to="/learn" hash="como-funciona" className="text-micro text-primary underline underline-offset-4">Entenda como um NFT funciona</Link>
        </div>
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {creator.process.map((step, i) => (
            <li key={step.title} className="space-y-2 rounded-lg bg-card p-4">
              <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-primary text-body font-bold text-primary-foreground">{i + 1}</span>
              <h3 className="font-bold"><span className="sr-only">Etapa {i + 1}: </span>{step.title}</h3>
              <p className="text-micro text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="collection-title" className="space-y-4">
        <h2 id="collection-title" className="text-title">Coleção de {creator.name}</h2>
        {creator.nfts.length === 0 ? (
          <EmptyState title="Nenhum NFT à venda agora" description="Os próximos lançamentos aparecem aqui." />
        ) : (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4" data-testid="creator-nfts">
            {creator.nfts.map((nft) => <li key={nft.id}><MarketCard nft={nft} /></li>)}
          </ul>
        )}
      </section>
    </Container>
  )
}

/** Mesmas proporções do perfil: arte quadrada + bloco de informações. */
export function CreatorDetailSkeleton() {
  return (
    <Container className="space-y-10 py-6 md:py-10" aria-busy="true" aria-label="Carregando criador">
      <Skeleton className="hidden h-5 w-56 md:block" />
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-16 w-2/3" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </Container>
  )
}
