import { Link } from '@tanstack/react-router'
import { Unavailable } from '@/components/feedback/unavailable'
import { NftImage } from '@/components/nft/nft-image'
import { Button } from '@/components/ui/button'
import { ARTWORKS } from '../artworks'
import { CATALOG_ANCHOR } from '../hooks/use-catalog-search'

const POSTS = [
  { image: ARTWORKS.baron, date: '12 de outubro', read: '4 min', title: 'Como funciona a propriedade de NFTs', text: 'Aprenda o essencial para registrar e verificar ativos digitais.' },
  { image: ARTWORKS.emerald, date: '08 de outubro', read: '6 min', title: '10 artistas digitais para acompanhar', text: 'Conheça criadores que estão redefinindo a cultura digital.' },
  { image: ARTWORKS.nomad, date: '02 de outubro', read: '5 min', title: 'Raridade, atributos e procedência', text: 'Entenda o que torna uma edição valiosa e verificável.' },
  { image: ARTWORKS.golden, date: '27 de setembro', read: '3 min', title: 'Como proteger sua carteira', text: 'Práticas simples para manter sua coleção segura.' },
]

/** Seções institucionais da tela inicial. Os banners levam a filtros reais do catálogo. */
export function HomeEditorial() {
  return (
    <div className="space-y-16">
      <section aria-label="Coleções em destaque" className="grid gap-6 md:grid-cols-2">
        <PromoCard
          image={ARTWORKS.emerald}
          title="Lançamentos gênesis de edição limitada"
          text="Colecione peças numeradas diretamente dos criadores, com selos de raridade visíveis."
          link={<Link to="/" search={{ tab: 'new' }} hash={CATALOG_ANCHOR}>Explorar</Link>}
        />
        <PromoCard
          image={ARTWORKS.baron}
          title="Arte digital selecionada e muito mais"
          text="Explore novos artistas, coleções verificadas e drops lançados por criadores."
          link={<Link to="/" search={{ categories: ['arte-digital'] }} hash={CATALOG_ANCHOR}>Explorar</Link>}
        />
      </section>

      <section aria-labelledby="journal-title" className="space-y-6">
        <header className="space-y-1 text-center">
          <h2 id="journal-title" className="text-heading">Diário da Cunhagem</h2>
          <p className="text-muted-foreground">
            Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
          </p>
        </header>
        {/* Mobile: carrossel horizontal com snap (o Figma mobile não desenha esta seção). */}
        {/* tabIndex: região rolável sem itens focáveis precisa receber foco para rolar pelo teclado. */}
        <ul
          tabIndex={0}
          aria-label="Artigos do Diário da Cunhagem"
          className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 lg:grid-cols-4"
        >
          {POSTS.map((post) => (
            <li key={post.title} className="relative w-64 shrink-0 snap-start sm:w-auto">
              <article className="flex h-full flex-col overflow-hidden rounded-lg bg-card">
                <div className="aspect-[16/10] overflow-hidden">
                  <NftImage image={{ ...post.image, alt: '' }} sizes="(min-width: 1024px) 18rem, (min-width: 640px) 45vw, 16rem" />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <p className="text-micro text-muted-foreground">{post.date} | Leitura de {post.read}</p>
                  <h3 className="font-bold">{post.title}</h3>
                  <p className="flex-1 text-micro text-muted-foreground">{post.text}</p>
                  <Unavailable className="text-micro font-bold text-primary">Ler mais</Unavailable>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function PromoCard({ image, title, text, link }: { image: typeof ARTWORKS.emerald; title: string; text: string; link: React.ReactElement }) {
  return (
    <article className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-4 overflow-hidden rounded-lg bg-card p-3">
      <div className="aspect-square overflow-hidden rounded-lg">
        <NftImage image={image} sizes="(min-width: 768px) 14rem, 40vw" />
      </div>
      <div className="space-y-3 text-center">
        <h3 className="font-bold">{title}</h3>
        <p className="text-micro text-muted-foreground">{text}</p>
        <Button asChild size="sm">{link}</Button>
      </div>
    </article>
  )
}
