import { Link, useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { NftRail } from '@/features/catalog/components/nft-rail'
import { useCart } from '../hooks/use-cart'
import { CartItems } from './cart-items'
import { CartSummary } from './cart-summary'

export function CartPage() {
  const cart = useCart()
  const router = useRouter()
  const navigate = useNavigate()
  const canGoBack = useCanGoBack()

  return (
    <Container className="space-y-8 py-4 md:py-8">
      <Breadcrumb
        className="hidden md:block"
        items={[{ label: 'Início', link: { to: '/' } }, { label: 'Mercado', link: { to: '/', hash: 'catalogo' } }, { label: 'Carrinho' }]}
      />
      <div className="relative flex items-center justify-center md:hidden">
        <button
          type="button"
          onClick={() => (canGoBack ? router.history.back() : void navigate({ to: '/' }))}
          aria-label="Voltar"
          className="absolute left-0 flex size-10 items-center justify-center rounded-full bg-card text-primary"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <h1 className="text-title">Carrinho de NFTs</h1>
      </div>
      {/* Desktop: o Figma só mostra a trilha; o título fica para leitores de tela. */}
      <h1 className="hidden md:block md:sr-only">Carrinho de NFTs</h1>

      {cart.isPending ? (
        <CartSkeleton />
      ) : cart.isError ? (
        <ErrorState title="Não foi possível carregar o carrinho" error={cart.error} onRetry={() => void cart.refetch()} retrying={cart.isFetching} />
      ) : cart.data.items.length === 0 ? (
        <EmptyState
          title="Seu carrinho está vazio"
          description="Explore o mercado e escolha a edição dos NFTs que você quer colecionar."
          action={<Button asChild><Link to="/" hash="catalogo">Explorar NFTs</Link></Button>}
        />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
          <CartItems items={cart.data.items} />
          <div className="lg:sticky lg:top-24">
            <CartSummary cart={cart.data} />
          </div>
        </div>
      )}

      <NftRail title="Colecionadores também viram" />
    </Container>
  )
}

/** Mesmo layout do carrinho carregado: linhas à esquerda, resumo à direita. */
function CartSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando carrinho" className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24 w-full md:h-16" />)}
      </div>
      <div className="space-y-3 rounded-lg bg-card p-5" data-testid="summary-skeleton">
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-5 w-full rounded-sm" />)}
      </div>
    </div>
  )
}
