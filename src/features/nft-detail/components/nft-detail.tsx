import { Link, useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { ChevronLeft, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { toast } from '@/lib/toast'
import { Unavailable } from '@/components/feedback/unavailable'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { Container } from '@/components/layout/container'
import { Rating } from '@/components/nft/rating'
import { Button } from '@/components/ui/button'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { useAddToCart, useCart } from '@/features/cart/hooks/use-cart'
import { NftRail } from '@/features/catalog/components/nft-rail'
import { NETWORK_LABEL } from '@/features/catalog/labels'
import { FavoriteButton } from '@/features/favorites/components/favorite-button'
import { errorMessage } from '@/lib/form-errors'
import { formatEthWithUnit } from '@/lib/money'
import type { EditionId, Nft, NftEdition } from '@/types'
import { EditionPicker } from './edition-picker'
import { NftGallery } from './nft-gallery'
import { ShareLinks } from './share-links'

const isAvailable = (e: NftEdition) => e.status !== 'sold_out'

/** Começa na 1/50 (como no Figma) se houver estoque; senão, na primeira edição disponível. */
const defaultEdition = (editions: NftEdition[]) =>
  editions.find((e) => e.label === '1/50' && isAvailable(e)) ?? editions.find(isAvailable) ?? editions[0]

function editionStatusText(edition: NftEdition): string {
  if (edition.status === 'sold_out') return 'Edição esgotada.'
  if (edition.available === null) return 'Edição aberta: sem limite de tiragem.'
  if (edition.status === 'low_stock') return `Últimas unidades: ${edition.available} de ${edition.supply}.`
  return `${edition.available} de ${edition.supply} disponíveis.`
}

const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`

export function NftDetail({ nft }: { nft: Nft }) {
  const navigate = useNavigate()
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const [editionId, setEditionId] = useState<EditionId | undefined>(() => defaultEdition(nft.editions)?.id)
  const [quantity, setQuantity] = useState(1)
  const { data: cart } = useCart()
  const addToCart = useAddToCart()

  const edition = nft.editions.find((e) => e.id === editionId)
  const inCart = cart?.items.find((i) => i.editionId === editionId)?.quantity ?? 0
  const limit = edition ? Math.min(edition.maxPerOrder, edition.available ?? Number.POSITIVE_INFINITY) : 0
  const maxAddable = Math.max(0, limit - inCart)
  const canBuy = !!edition && isAvailable(edition) && maxAddable > 0
  const qty = Math.min(quantity, Math.max(maxAddable, 1))

  const selectEdition = (id: EditionId) => {
    setEditionId(id)
    setQuantity(1)
  }

  const buy = async (goToCart: boolean) => {
    if (!edition) return
    try {
      await addToCart.mutateAsync({ nftId: nft.id, editionId: edition.id, quantity: qty })
      setQuantity(1)
      if (goToCart) {
        await navigate({ to: '/cart' })
        return
      }
      toast.success(`${nft.name} adicionado ao carrinho.`, {
        action: { label: 'Ver carrinho', onClick: () => void navigate({ to: '/cart' }) },
      })
    } catch (error) {
      toast.error('Não foi possível adicionar ao carrinho.', { description: errorMessage(error) })
    }
  }

  const goBack = () => (canGoBack ? router.history.back() : void navigate({ to: '/' }))

  const limitHint = !edition
    ? null
    : !isAvailable(edition)
      ? 'Escolha outra edição: esta está esgotada.'
      : maxAddable === 0
        ? `Você já tem o máximo desta edição (${limit}) no carrinho.`
        : qty >= maxAddable
          ? `Máximo de ${maxAddable} ${inCart ? 'a mais ' : ''}por pedido nesta edição.`
          : null

  const price = edition?.price ?? nft.price

  return (
    <div className="pb-48 md:pb-0">
      <Container className="space-y-6 px-0 md:px-6 md:py-8">
        <Breadcrumb
          className="hidden md:block"
          items={[{ label: 'Início', link: { to: '/' } }, { label: 'Mercado', link: { to: '/', hash: 'catalogo' } }, { label: nft.name }]}
        />

        {/* max-md:!mt-0: no mobile a trilha está escondida e a imagem encosta no topo (Figma). */}
        <div className="grid gap-6 max-md:!mt-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-10">
          <div className="relative">
            <NftGallery images={nft.gallery} name={nft.name} />
            {/* Mobile (Figma): voltar e favoritar sobre a imagem */}
            <div className="absolute inset-x-4 top-4 flex justify-between md:hidden">
              <button
                type="button"
                onClick={goBack}
                aria-label="Voltar"
                className="flex size-10 items-center justify-center rounded-full bg-background/70 text-primary backdrop-blur"
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <FavoriteButton nftId={nft.id} name={nft.name} variant="overlay" className="size-10" />
            </div>
          </div>

          <div className="-mt-10 space-y-4 rounded-t-2xl bg-card px-5 pt-6 md:mt-0 md:rounded-none md:bg-transparent md:p-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-heading">{nft.name}</h1>
              <Rating average={nft.rating.average} count={nft.rating.count} compact className="md:hidden" />
            </div>
            <div className="hidden flex-wrap items-center justify-between gap-3 md:flex">
              <p className="text-heading text-primary" data-testid="detail-price">{formatEthWithUnit(price)}</p>
              <Rating average={nft.rating.average} count={nft.rating.count} />
            </div>

            <div className="space-y-1">
              <h2 className="hidden font-bold md:block">Sobre este NFT:</h2>
              <p className="text-muted-foreground">{nft.description}</p>
            </div>

            {editionId && <EditionPicker editions={nft.editions} value={editionId} onChange={selectEdition} />}
            {edition && <p className="text-micro text-muted-foreground" aria-live="polite">{editionStatusText(edition)}</p>}

            {/* Desktop: quantidade + comprar + favoritar */}
            <div className="hidden flex-wrap items-center gap-4 md:flex">
              <QuantityStepper
                value={qty}
                max={Math.max(maxAddable, 1)}
                onChange={setQuantity}
                disabled={!canBuy}
                size="lg"
                label={`Quantidade de ${nft.name}`}
              />
              <Button onClick={() => void buy(true)} disabled={!canBuy || addToCart.isPending} className="min-w-32 uppercase">
                {addToCart.isPending ? 'Adicionando…' : 'Comprar'}
              </Button>
              <FavoriteButton nftId={nft.id} name={nft.name} variant="button" />
            </div>
            {limitHint && <p role="status" className="text-micro text-warning">{limitHint}</p>}

            <dl className="space-y-1 text-muted-foreground">
              <div className="flex gap-1"><dt>ID do token:</dt><dd>#{nft.tokenId}</dd></div>
              <div className="flex gap-1"><dt>Coleção:</dt><dd>{nft.collection.name}</dd></div>
              <div className="flex gap-1"><dt>Atributos:</dt><dd>{nft.attributes.join(', ')}</dd></div>
            </dl>
            <div className="hidden md:block"><ShareLinks name={nft.name} /></div>
          </div>
        </div>

        <section aria-labelledby="detail-tabs" className="space-y-4 px-4 md:px-0">
          <h2 id="detail-tabs" className="sr-only">Mais informações</h2>
          <div className="flex gap-6 border-b border-border">
            <span className="-mb-px border-b-2 border-primary pb-2 font-bold text-primary">Detalhes do NFT</span>
            <Unavailable className="pb-2">Avaliações de colecionadores ({nft.rating.count})</Unavailable>
          </div>
          <div className="space-y-3 text-muted-foreground">
            <p>{nft.description}</p>
            <p><strong className="text-foreground">Rede:</strong> cunhado na {NETWORK_LABEL[nft.network]}, com procedência imutável e metadados armazenados no IPFS.</p>
            <p><strong className="text-foreground">Contrato:</strong> {shortAddress(nft.contractAddress)} · contrato inteligente ERC-721 verificado.</p>
            <p><strong className="text-foreground">Direitos autorais:</strong> {nft.royaltyPercent}% para o criador nas vendas secundárias, pagos automaticamente nos mercados compatíveis.</p>
          </div>
        </section>

        <div className="px-4 md:px-0">
          <NftRail title="Mais desta coleção" excludeId={nft.id} />
        </div>
        <p className="px-4 md:hidden">
          <Link to="/" hash="catalogo" className="text-primary underline-offset-4 hover:underline">Ver todo o catálogo</Link>
        </p>
      </Container>

      {/* Mobile (Figma): barra de compra fixa */}
      <div className="fixed inset-x-0 bottom-0 z-40 space-y-4 rounded-t-2xl bg-card p-5 shadow-[0_-8px_24px_rgb(0_0_0/0.4)] md:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>Qtd.</span>
            <QuantityStepper value={qty} max={Math.max(maxAddable, 1)} onChange={setQuantity} disabled={!canBuy} label={`Quantidade de ${nft.name}`} />
          </div>
          <p className="text-title text-primary">{formatEthWithUnit(price)}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="gradient" size="lg" className="flex-1 rounded-full text-title" onClick={() => void buy(true)} disabled={!canBuy || addToCart.isPending}>
            Comprar NFT
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="size-12 rounded-full"
            onClick={() => void buy(false)}
            disabled={!canBuy || addToCart.isPending}
            aria-label={`Adicionar ${nft.name} ao carrinho`}
          >
            <ShoppingCart className="!size-5 text-primary" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
}
