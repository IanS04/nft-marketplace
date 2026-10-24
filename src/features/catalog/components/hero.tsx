import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { NftImage } from '@/components/nft/nft-image'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { useMediaQuery } from '@/lib/use-media-query'
import { ARTWORKS } from '../artworks'
import { CATALOG_ANCHOR } from '../hooks/use-catalog-search'

const SLIDES = [ARTWORKS.emerald, ARTWORKS.nomad, ARTWORKS.golden]
/** Os mesmos `sizes` do preload no index.html: o navegador reaproveita a imagem pré-carregada. */
const HERO_SIZES = '(min-width: 1024px) 24rem, (min-width: 768px) 22rem, 7.5rem'

/**
 * Hero institucional (conteúdo estático). Carrossel manual: sem autoplay, por acessibilidade.
 * Renderiza só a variante do tamanho atual: imagem escondida com CSS ainda seria baixada.
 */
export function Hero() {
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index] ?? ARTWORKS.emerald
  const isDesktop = useMediaQuery('(min-width: 768px)')

  return isDesktop ? (
    <section aria-labelledby="hero-title" className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="space-y-5">
        <p className="text-body">Bem-vindo à Kurio</p>
        <h1 id="hero-title" className="text-display uppercase leading-tight tracking-wide lg:text-[2.75rem]">
          Seja dono do futuro da arte digital
        </h1>
        <p className="max-w-lg text-body text-muted-foreground">
          Descubra NFTs selecionados de criadores emergentes e lendários. Colecione arte digital rara,
          apoie artistas e torne-se parte da cultura da internet.
        </p>
        <Button asChild className="uppercase">
          <Link from="/" to="/" search={(prev) => prev} hash={CATALOG_ANCHOR} resetScroll={false}>Explorar</Link>
        </Button>
        <SlideDots index={index} onSelect={setIndex} className="pt-6 lg:pl-[60%]" />
      </div>
      <div className="aspect-square overflow-hidden rounded-xl bg-secondary">
        <NftImage image={slide} sizes={HERO_SIZES} priority />
      </div>
    </section>
  ) : (
    <section aria-labelledby="hero-title-mobile" className="relative overflow-hidden rounded-2xl bg-hero-gradient p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-3">
        <div className="space-y-2">
          <p className="text-micro">Bem-vindo à Kurio</p>
          <h1 id="hero-title-mobile" className="text-title uppercase">Seja dono da cultura digital</h1>
          <p className="text-micro text-muted-foreground">Descubra NFTs selecionados de criadores do mundo todo.</p>
          <Link
            from="/"
            to="/"
            search={(prev) => prev}
            hash={CATALOG_ANCHOR}
            resetScroll={false}
            className="inline-flex items-center gap-1 text-micro font-bold uppercase text-primary"
          >
            Explorar <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
        <div className="relative">
          <div className="aspect-square overflow-hidden rounded-lg">
            <NftImage image={slide} sizes={HERO_SIZES} priority />
          </div>
          <div className="absolute -bottom-2 -left-4 size-12 overflow-hidden rounded-lg ring-2 ring-background/60">
            <NftImage image={SLIDES[(index + 1) % SLIDES.length] ?? ARTWORKS.nomad} sizes="3rem" />
          </div>
        </div>
      </div>
      <SlideDots index={index} onSelect={setIndex} className="mt-3 justify-center" />
    </section>
  )
}

function SlideDots({ index, onSelect, className }: { index: number; onSelect: (i: number) => void; className?: string }) {
  return (
    <div role="group" aria-label="Escolher arte em destaque" className={cn('flex gap-1', className)}>
      {SLIDES.map((_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Arte ${i + 1} de ${SLIDES.length}`}
          aria-pressed={i === index}
          onClick={() => onSelect(i)}
          className="flex size-6 items-center justify-center rounded-full"
        >
          <span className={cn('size-2 rounded-full transition-colors', i === index ? 'bg-primary' : 'bg-primary/40')} />
        </button>
      ))}
    </div>
  )
}
