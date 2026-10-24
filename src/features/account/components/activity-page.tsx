import { Link } from '@tanstack/react-router'
import { CheckCircle2, Download, LifeBuoy, ShoppingCart, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/date'
import type { ActivityType } from '@/types'
import { useActivity } from '../hooks/use-member'
import { SectionHeader } from './section-header'

// Ícone + rótulo em texto: o tipo nunca depende só da cor.
const TYPE: Record<ActivityType, { icon: ReactNode; label: string }> = {
  'order.created': { icon: <ShoppingCart className="size-4" aria-hidden="true" />, label: 'Compra' },
  'order.confirmed': { icon: <CheckCircle2 className="size-4 text-success" aria-hidden="true" />, label: 'Compra' },
  'order.rejected': { icon: <XCircle className="size-4 text-destructive" aria-hidden="true" />, label: 'Compra' },
  download: { icon: <Download className="size-4" aria-hidden="true" />, label: 'Download' },
  'support.ticket': { icon: <LifeBuoy className="size-4" aria-hidden="true" />, label: 'Suporte' },
}

/** Histórico do colecionador: pedidos, pagamentos, downloads e chamados (montado pela API). */
export function ActivityPage() {
  const activity = useActivity()
  const header = <SectionHeader title="Atividade" description="Tudo o que aconteceu na sua conta, do mais recente ao mais antigo." />

  if (activity.isPending) {
    return (
      <>
        {header}
        <div aria-busy="true" aria-label="Carregando atividade" className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[4.5rem] w-full" />)}
        </div>
      </>
    )
  }
  if (activity.isError) {
    return (
      <>
        {header}
        <ErrorState title="Não foi possível carregar sua atividade" error={activity.error} onRetry={() => void activity.refetch()} retrying={activity.isFetching} />
      </>
    )
  }
  if (activity.data.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          title="Nenhuma atividade ainda"
          description="Suas compras, downloads e chamados de suporte aparecem aqui."
          action={<Button asChild><Link to="/" hash="catalogo">Explorar o mercado</Link></Button>}
        />
      </>
    )
  }

  return (
    <>
      {header}
      <ol className="space-y-3" aria-label="Histórico da conta" data-testid="activity-list">
        {activity.data.map((item) => (
          <li key={item.id} className="flex items-start gap-3 rounded-lg bg-card p-4">
            <span className="mt-0.5 text-primary">{TYPE[item.type].icon}</span>
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="font-bold">
                <span className="sr-only">{TYPE[item.type].label}: </span>
                {item.title}
              </p>
              <p className="break-words text-micro text-muted-foreground">{item.description}</p>
              {item.orderId && (
                <Link to="/orders/$orderId" params={{ orderId: item.orderId }} className="text-micro text-primary underline underline-offset-4">
                  Ver pedido
                </Link>
              )}
            </div>
            <time dateTime={item.occurredAt} className="shrink-0 text-micro text-muted-foreground">{formatDateTime(item.occurredAt)}</time>
          </li>
        ))}
      </ol>
    </>
  )
}
