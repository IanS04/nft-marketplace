import { Link } from '@tanstack/react-router'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { ErrorState } from '@/components/feedback/error-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'
import { formatEth } from '@/lib/money'
import type { Cart } from '@/types'
import { useQuote } from '../hooks/use-cart'
import { CouponForm } from './coupon-form'

/**
 * "Resumo da carteira": TODOS os valores vêm da cotação da API (POST /quote).
 * O cliente não soma nada: só apresenta.
 */
// Mobile (Figma): botão grande, arredondado e em gradiente.
const CTA = 'w-full max-md:h-12 max-md:rounded-full max-md:bg-primary-gradient max-md:text-title'

export function CartSummary({ cart }: { cart: Cart }) {
  const quote = useQuote(cart)
  const data = quote.data
  const blocking = data?.issues.filter((i) => i.severity === 'blocking') ?? []
  const canCheckout = !!data && !quote.isPlaceholderData && blocking.length === 0 && !quote.isFetching

  return (
    <section
      aria-labelledby="summary-title"
      className="space-y-4 bg-card p-5 max-md:rounded-t-2xl md:rounded-lg md:border md:border-border"
    >
      <h2 id="summary-title" className="text-title max-md:sr-only">Resumo da carteira</h2>
      <CouponForm appliedCode={cart.couponCode} />

      {quote.isPending ? (
        <div aria-busy="true" aria-label="Calculando valores" data-testid="summary-skeleton" className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-5 w-full rounded-sm" />)}
        </div>
      ) : quote.isError && !data ? (
        <ErrorState title="Não foi possível calcular os valores" error={quote.error} onRetry={() => void quote.refetch()} retrying={quote.isFetching} className="p-4" />
      ) : data ? (
        <div aria-busy={quote.isPlaceholderData} className={cn('space-y-3 transition-opacity', quote.isPlaceholderData && 'opacity-60')}>
          <dl className="space-y-2" data-testid="cart-summary">
            <Row label="Subtotal" value={`${formatEth(data.subtotal)} ETH`} />
            <Row label="Desconto do lançamento" value={`(-) ${formatEth(data.discount)} ETH`} />
            <Row
              label="Taxa de rede"
              value={`${formatEth(data.networkFee)} ETH`}
              hint={data.feeIsEstimate ? 'Taxa estimada' : undefined}
            />
            <div className="flex items-baseline justify-between border-t border-border pt-3 text-title">
              <dt>Total</dt>
              <dd className="text-primary" data-testid="cart-total">{formatEth(data.total)} ETH</dd>
            </div>
          </dl>
          {quote.isFetching && (
            <p role="status" className="flex items-center gap-1 text-micro text-muted-foreground">
              <Loader2 className="size-3 animate-spin" aria-hidden="true" /> Atualizando valores…
            </p>
          )}
          {blocking.length > 0 && (
            <ul role="alert" className="space-y-1 rounded-sm border border-warning/60 bg-warning/10 p-3 text-micro">
              {blocking.map((issue, i) => (
                <li key={i} className="flex gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden="true" />
                  {issue.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {canCheckout ? (
        <Button asChild className={CTA}>
          <Link to="/checkout">Conectar e finalizar</Link>
        </Button>
      ) : (
        <Button disabled className={CTA}>
          Conectar e finalizar
        </Button>
      )}
      <p className="text-center">
        <Link to="/" hash="catalogo" className="text-primary underline-offset-4 hover:underline">Continuar explorando</Link>
      </p>
    </section>
  )
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt>{label}</dt>
      <dd className="text-right">
        {value}
        {hint && <span className="block text-micro text-primary">{hint}</span>}
      </dd>
    </div>
  )
}
