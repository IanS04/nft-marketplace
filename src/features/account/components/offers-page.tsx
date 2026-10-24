import { Link } from '@tanstack/react-router'
import { BadgePercent } from 'lucide-react'
import { announce } from '@/components/feedback/announcer'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useApplyCoupon, useCart } from '@/features/cart/hooks/use-cart'
import { formatDate } from '@/lib/date'
import { errorMessage } from '@/lib/form-errors'
import { formatEth } from '@/lib/money'
import { toast } from '@/lib/toast'
import type { Offer } from '@/types'
import { useOffers } from '../hooks/use-member'
import { SectionHeader } from './section-header'

/**
 * Ofertas = cupons publicados pela loja. "Aplicar" usa o mesmo PUT /cart/coupon do carrinho:
 * o desconto real vem da cotação. Cupom expirado aparece, mas não pode ser aplicado.
 */
export function OffersPage() {
  const offers = useOffers()
  const cart = useCart()
  const header = <SectionHeader title="Ofertas" description="Cupons disponíveis para usar no seu carrinho." />

  if (offers.isPending) {
    return (
      <>
        {header}
        <div aria-busy="true" aria-label="Carregando ofertas" className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      </>
    )
  }
  if (offers.isError) {
    return (
      <>
        {header}
        <ErrorState title="Não foi possível carregar as ofertas" error={offers.error} onRetry={() => void offers.refetch()} retrying={offers.isFetching} />
      </>
    )
  }
  if (offers.data.length === 0) {
    return <>{header}<EmptyState title="Nenhuma oferta no momento" description="Volte mais tarde para conferir novos cupons." /></>
  }

  return (
    <>
      {header}
      <ul className="grid gap-4 md:grid-cols-2" aria-label="Cupons" data-testid="offers-list">
        {offers.data.map((offer) => (
          <li key={offer.code}>
            <OfferCard offer={offer} applied={cart.data?.couponCode === offer.code} cartEmpty={cart.data?.items.length === 0} />
          </li>
        ))}
      </ul>
    </>
  )
}

function OfferCard({ offer, applied, cartEmpty }: { offer: Offer; applied: boolean; cartEmpty: boolean }) {
  const apply = useApplyCoupon()
  const expired = offer.status === 'expired'
  const value = offer.kind === 'percent' ? `${offer.value}%` : `${formatEth(offer.value)} ETH`

  const onApply = async () => {
    try {
      await apply.mutateAsync(offer.code)
      toast.success(`Cupom ${offer.code} aplicado ao seu carrinho.`)
      announce(`Cupom ${offer.code} aplicado ao seu carrinho.`)
    } catch (error) {
      toast.error(`Não foi possível aplicar o cupom ${offer.code}.`, { description: errorMessage(error) })
    }
  }

  return (
    <article aria-labelledby={`offer-${offer.code}`} className="flex h-full flex-col gap-3 rounded-lg bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 id={`offer-${offer.code}`} className="font-bold">{offer.title}</h2>
          <p className="text-micro text-muted-foreground">{offer.description}</p>
        </div>
        <BadgePercent className="size-5 shrink-0 text-primary" aria-hidden="true" />
      </div>
      <dl className="grid grid-cols-2 gap-2 text-micro">
        <div><dt className="text-muted-foreground">Código</dt><dd className="font-bold tracking-wider">{offer.code}</dd></div>
        <div><dt className="text-muted-foreground">Desconto</dt><dd className="font-bold">{value}</dd></div>
        <div className="col-span-2">
          <dt className="sr-only">Situação</dt>
          <dd className={expired ? 'text-destructive' : 'text-success'}>
            {expired ? `Expirou em ${formatDate(offer.validUntil)}` : `Válido até ${formatDate(offer.validUntil)}`}
          </dd>
        </div>
      </dl>
      <div className="mt-auto flex flex-wrap items-center gap-3">
        {expired ? (
          <Button variant="secondary" disabled>Expirado</Button>
        ) : applied ? (
          <>
            <p role="status" className="text-micro font-bold text-success">Aplicado no carrinho</p>
            {cartEmpty ? (
              <p className="w-full text-micro text-muted-foreground">O desconto vale para os NFTs que você adicionar ao carrinho.</p>
            ) : (
              <Button asChild variant="link" className="h-auto px-0"><Link to="/cart">Ver carrinho</Link></Button>
            )}
          </>
        ) : (
          // O texto visível faz parte do nome acessível (WCAG 2.5.3); o código vai só para leitores de tela.
          <Button onClick={() => void onApply()} disabled={apply.isPending}>
            {apply.isPending ? 'Aplicando…' : 'Aplicar no carrinho'}
            <span className="sr-only"> cupom {offer.code}</span>
          </Button>
        )}
      </div>
    </article>
  )
}
