import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { announce } from '@/components/feedback/announcer'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { PROVIDER_LABEL, shortAddress } from '@/features/account/labels'
import { cartQueryOptions, quoteQueryOptions } from '@/features/cart/api/queries'
import { useCartTarget } from '@/features/cart/hooks/use-cart-target'
import { NETWORK_LABEL } from '@/features/catalog/labels'
import { errorMessage } from '@/lib/form-errors'
import { compare, formatEth } from '@/lib/money'
import { isApiError } from '@/services/api/errors'
import type { Blockchain, CollectorDetails, EthAmount, Quote, Wallet, WalletProvider } from '@/types'
import { useUserScope } from '@/features/account/hooks/use-user-scope'
import { useSession } from '@/features/auth/hooks/use-session'
import { useCreateOrder } from '../hooks/use-orders'

const RETRY_ATTEMPTS = 3
const RETRY_WAIT_MS = 1_500
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type Phase = 'loading' | 'ready' | 'submitting' | 'verifying' | 'error'

interface OrderReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Total que o usuário estava vendo na página: base para detectar mudança. */
  seenTotal: EthAmount | undefined
  wallet: Wallet
  provider: WalletProvider
  network: Blockchain
  collector: CollectorDetails
}

export function OrderReviewDialog({ open, onOpenChange, seenTotal, wallet, provider, network, collector }: OrderReviewDialogProps) {
  const queryClient = useQueryClient()
  const target = useCartTarget()
  const navigate = useNavigate()
  const createOrder = useCreateOrder()
  const { keys } = useUserScope()
  const [phase, setPhase] = useState<Phase>('loading')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { status } = useSession()
  const blockedBySession = useRef(false)

  /** Revalida no servidor: carrinho atual → cotação nova. Nunca confia no que está em cache. */
  const revalidate = useCallback(
    async (baseline: EthAmount | undefined, reason?: string) => {
      setPhase('loading')
      setError(null)
      try {
        const cart = await queryClient.fetchQuery({ ...cartQueryOptions(target), staleTime: 0 })
        const fresh = await queryClient.fetchQuery({ ...quoteQueryOptions(target, cart, network), staleTime: 0 })
        setQuote(fresh)
        const changed = baseline !== undefined && compare(baseline, fresh.total) !== 0
        const message = changed
          ? `Os valores mudaram: o total passou de ${formatEth(baseline)} ETH para ${formatEth(fresh.total)} ETH. Confira e confirme novamente.`
          : reason ?? null
        setNotice(message)
        if (message) announce(message, 'assertive')
        setPhase(fresh.issues.some((i) => i.severity === 'blocking') ? 'error' : 'ready')
        if (fresh.issues.length) setError(fresh.issues.map((i) => i.message).join(' '))
      } catch (e) {
        blockedBySession.current = isApiError(e) && e.status === 401
        setPhase('error')
        setError(errorMessage(e))
      }
    },
    [queryClient, target, network],
  )

  useEffect(() => {
    if (open) void revalidate(seenTotal)
    // Só ao abrir: depois, quem manda revalidar é o fluxo de confirmação.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // A sessão expirou no meio da revisão: depois do novo login, a conferência é refeita sozinha.
  useEffect(() => {
    if (!open || status !== 'authenticated' || !blockedBySession.current) return
    blockedBySession.current = false
    void revalidate(seenTotal)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const confirm = async () => {
    if (!quote) return
    setPhase('submitting')
    setError(null)
    const input = { quoteId: quote.id, cartVersion: quote.cartVersion, walletId: wallet.id, provider, network, collector }

    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        // Mesmo conteúdo → mesma Idempotency-Key: se o 1º envio criou o pedido, este o devolve.
        const order = await createOrder.mutateAsync(input)
        if (keys) void queryClient.invalidateQueries({ queryKey: keys.pendingOrders })
        onOpenChange(false)
        await navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
        return
      } catch (e) {
        if (isApiError(e) && (e.code === 'QUOTE_STALE' || e.code === 'AVAILABILITY_CONFLICT')) {
          await revalidate(quote.total, e.message)
          return
        }
        if (isApiError(e) && e.code === 'NETWORK_ERROR' && attempt < RETRY_ATTEMPTS) {
          setPhase('verifying')
          announce('Não recebemos a resposta. Verificando seu pedido…')
          await wait(RETRY_WAIT_MS)
          continue
        }
        setPhase('error')
        setError(
          isApiError(e) && e.code === 'NETWORK_ERROR'
            ? 'Não conseguimos confirmar o envio. Nenhum pedido foi duplicado: tente novamente para verificar.'
            : errorMessage(e),
        )
        return
      }
    }
  }

  const busy = phase === 'submitting' || phase === 'verifying'

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next) }}>
      <DialogContent className="max-w-lg space-y-4" hideClose={busy}>
        <div className="space-y-1">
          <DialogTitle>Revise seu pedido</DialogTitle>
          <DialogDescription>Os valores abaixo foram conferidos agora com o servidor.</DialogDescription>
        </div>

        {notice && (
          <p role="alert" className="flex gap-2 rounded-sm border border-warning/60 bg-warning/10 p-3 text-micro">
            <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden="true" /> {notice}
          </p>
        )}

        {!quote || phase === 'loading' ? (
          <div aria-busy="true" aria-label="Conferindo valores" className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-5 w-full rounded-sm" />)}
          </div>
        ) : (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-2 text-body">
              <dt className="text-muted-foreground">Colecionador</dt><dd>{collector.displayName}</dd>
              <dt className="text-muted-foreground">Carteira</dt><dd>{wallet.nickname} · {shortAddress(wallet.address)}</dd>
              <dt className="text-muted-foreground">Tipo e rede</dt><dd>{PROVIDER_LABEL[provider]} · {NETWORK_LABEL[network]}</dd>
            </dl>
            <dl className="space-y-1 border-t border-border pt-3" data-testid="review-summary">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatEth(quote.subtotal)} ETH</dd></div>
              <div className="flex justify-between"><dt>Desconto</dt><dd>(-) {formatEth(quote.discount)} ETH</dd></div>
              <div className="flex justify-between"><dt>Taxa de rede</dt><dd>{formatEth(quote.networkFee)} ETH</dd></div>
              <div className="flex justify-between text-title"><dt>Total</dt><dd className="text-primary" data-testid="review-total">{formatEth(quote.total)} ETH</dd></div>
            </dl>
          </div>
        )}

        {phase === 'verifying' && (
          <p role="status" className="flex items-center gap-2 text-micro">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Não recebemos a resposta. Verificando seu pedido…
          </p>
        )}
        {error && <p role="alert" className="text-micro text-destructive">{error}</p>}

        <div className="flex flex-wrap justify-end gap-3">
          {quote?.issues.some((i) => i.severity === 'blocking') && (
            <Button asChild variant="outline"><Link to="/cart">Ajustar carrinho</Link></Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Voltar</Button>
          <Button onClick={() => void confirm()} disabled={!quote || phase === 'loading' || busy || (phase === 'error' && !!quote?.issues.length)}>
            {busy ? 'Enviando…' : notice ? 'Confirmar com os novos valores' : 'Confirmar pagamento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
