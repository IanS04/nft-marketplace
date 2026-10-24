import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2, MailCheck, X, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { announce } from '@/components/feedback/announcer'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserScope } from '@/features/account/hooks/use-user-scope'
import { PROVIDER_LABEL, shortAddress } from '@/features/account/labels'
import { NETWORK_LABEL } from '@/features/catalog/labels'
import { clearIdempotencyKey } from '@/lib/idempotency'
import { formatEth, isZero } from '@/lib/money'
import { isApiError } from '@/services/api/errors'
import type { ConfirmedOrder, Order, PendingOrder, RejectedOrder } from '@/types'
import { orderScope, useOrder } from '../hooks/use-orders'

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))

export function OrderPage({ orderId }: { orderId: string }) {
  const order = useOrder(orderId)
  const queryClient = useQueryClient()
  const { user, keys } = useUserScope()
  const status = order.data?.status

  // Estado terminal: libera a chave de idempotência e sincroniza carrinho (itens comprados saíram).
  useEffect(() => {
    if (!user || !keys || (status !== 'confirmed' && status !== 'rejected')) return
    clearIdempotencyKey(orderScope(user.id))
    void queryClient.invalidateQueries({ queryKey: keys.cart })
    void queryClient.invalidateQueries({ queryKey: keys.pendingOrders })
    announce(status === 'confirmed' ? 'Pagamento confirmado. Seus NFTs estão na sua carteira.' : 'Pagamento recusado.', 'assertive')
  }, [status, user, keys, queryClient])

  return (
    <Container className="flex justify-center py-8 md:py-16">
      {order.isPending ? (
        <div aria-busy="true" aria-label="Carregando pedido" className="w-full max-w-lg space-y-3">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-8" />)}
        </div>
      ) : order.isError ? (
        isApiError(order.error) && order.error.status === 404 ? (
          <EmptyState
            title="Pedido não encontrado"
            description="Este pedido não existe ou não pertence à sua conta."
            action={<Button asChild><Link to="/">Voltar ao início</Link></Button>}
          />
        ) : (
          <ErrorState title="Não foi possível carregar o pedido" error={order.error} onRetry={() => void order.refetch()} />
        )
      ) : (
        <OrderStatusView order={order.data} />
      )}
    </Container>
  )
}

function OrderStatusView({ order }: { order: Order }) {
  if (order.status === 'confirmed') return <Receipt order={order} />
  if (order.status === 'rejected') return <Rejected order={order} />
  return <Pending order={order} />
}

const cardClass = 'w-full max-w-lg space-y-5 rounded-t-lg border-b-4 border-primary bg-card-elevated p-6 shadow-2xl'

function Pending({ order }: { order: PendingOrder }) {
  return (
    <section aria-labelledby="order-title" className={cardClass} data-testid="order-pending">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="size-10 animate-spin text-primary" aria-hidden="true" />
        <h1 id="order-title" className="text-title">Aguardando confirmação na rede {NETWORK_LABEL[order.network]}…</h1>
        <p role="status" className="text-muted-foreground">
          Seu pedido foi enviado. Você pode recarregar ou fechar esta página: ele continua sendo processado e nenhuma
          compra será duplicada.
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-body">
        <dt className="text-muted-foreground">Pedido</dt><dd>{order.id}</dd>
        <dt className="text-muted-foreground">Total</dt><dd>{formatEth(order.total)} ETH</dd>
      </dl>
    </section>
  )
}

function Rejected({ order }: { order: RejectedOrder }) {
  return (
    <section aria-labelledby="order-title" className={cardClass} data-testid="order-rejected">
      <div className="flex flex-col items-center gap-3 text-center">
        <XCircle className="size-10 text-destructive" aria-hidden="true" />
        <h1 id="order-title" className="text-title">Pagamento recusado</h1>
        <p className="text-muted-foreground">{order.rejection.message}</p>
        <p>Seus itens continuam no carrinho.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild><Link to="/checkout">Tentar novamente</Link></Button>
        <Button asChild variant="outline"><Link to="/cart">Ver carrinho</Link></Button>
      </div>
    </section>
  )
}

/** Recibo (Figma: modal de confirmação). Tudo vem do snapshot do pedido, não do catálogo atual. */
function Receipt({ order }: { order: ConfirmedOrder }) {
  const navigate = useNavigate()
  const [explorerOpen, setExplorerOpen] = useState(false)

  return (
    <section aria-labelledby="order-title" className={`${cardClass} relative`} data-testid="order-receipt">
      <button
        type="button"
        onClick={() => void navigate({ to: '/' })}
        aria-label="Fechar e voltar ao início"
        className="absolute right-3 top-3 rounded-sm p-1 text-primary hover:bg-secondary"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
      <div className="flex flex-col items-center gap-2 text-center">
        <MailCheck className="size-12 text-primary" aria-hidden="true" />
        <h1 id="order-title" className="text-title text-primary">Seus NFTs agora estão na sua carteira</h1>
      </div>

      <dl className="grid grid-cols-2 gap-3 border-y border-primary/60 py-3 text-micro sm:grid-cols-4 sm:divide-x sm:divide-primary/40">
        <div className="sm:pr-3"><dt className="text-primary">ID da transação</dt><dd data-testid="tx-id">{shortAddress(order.transactionId)}</dd></div>
        <div className="sm:px-3"><dt className="text-primary">Data</dt><dd>{formatDate(order.confirmedAt)}</dd></div>
        <div className="sm:px-3"><dt className="text-primary">Total</dt><dd>{formatEth(order.total)} ETH</dd></div>
        <div className="sm:pl-3"><dt className="text-primary">Carteira</dt><dd>{PROVIDER_LABEL[order.walletProvider]}</dd></div>
      </dl>

      <div className="space-y-3">
        <h2 className="font-bold">Detalhes da transação</h2>
        <table className="w-full text-body">
          <thead>
            <tr className="border-b border-primary/40 text-left">
              <th scope="col" className="pb-2">NFTs</th>
              <th scope="col" className="pb-2 text-center">Edições</th>
              <th scope="col" className="pb-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.editionId}>
                <td className="py-2">
                  <div className="flex items-center gap-3">
                    <img src={item.imageUrl} alt="" width={40} height={40} className="size-10 rounded-sm object-cover" />
                    <div>
                      <p className="font-bold">{item.name}</p>
                      <p className="text-micro text-muted-foreground">ID do token: #{item.tokenId} · {item.editionLabel}</p>
                    </div>
                  </div>
                </td>
                <td className="text-center">(x {item.quantity})</td>
                <td className="text-right font-bold text-primary">{formatEth(item.lineTotal)} ETH</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="ml-auto max-w-xs space-y-1 text-body" data-testid="receipt-totals">
          {!isZero(order.discount) && (
            <div className="flex justify-between"><dt>Desconto ({order.couponCode})</dt><dd>(-) {formatEth(order.discount)} ETH</dd></div>
          )}
          <div className="flex justify-between"><dt>Taxa de rede</dt><dd>{formatEth(order.networkFee)} ETH</dd></div>
          <div className="flex justify-between font-bold"><dt>Total</dt><dd className="text-primary" data-testid="receipt-total">{formatEth(order.total)} ETH</dd></div>
        </dl>
      </div>

      <p className="border-t border-primary/40 pt-3 text-center text-micro text-primary">
        Transação confirmada na {NETWORK_LABEL[order.network]}. A propriedade foi transferida para sua carteira conectada e registrada na rede.
      </p>
      <div className="flex justify-center">
        <Button onClick={() => setExplorerOpen(true)}>Ver no Etherscan</Button>
      </div>

      <Dialog open={explorerOpen} onOpenChange={setExplorerOpen}>
        <DialogContent className="space-y-3">
          <DialogTitle>Explorador de blocos (simulado)</DialogTitle>
          <DialogDescription>
            Esta é uma transação simulada: ela não existe numa blockchain real, por isso não abrimos o Etherscan.
          </DialogDescription>
          <dl className="space-y-2 break-all text-micro">
            <div><dt className="text-primary">Hash</dt><dd>{order.transactionId}</dd></div>
            <div><dt className="text-primary">Rede</dt><dd>{NETWORK_LABEL[order.network]}</dd></div>
            <div><dt className="text-primary">Carteira de destino</dt><dd>{order.walletAddress}</dd></div>
            <div><dt className="text-primary">Status</dt><dd>Confirmada</dd></div>
          </dl>
        </DialogContent>
      </Dialog>
    </section>
  )
}
