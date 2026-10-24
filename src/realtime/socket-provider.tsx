import { useQueryClient } from '@tanstack/react-query'
import { useRouterState } from '@tanstack/react-router'
import { WifiOff } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { toast } from '@/lib/toast'
import { queryKeys } from '@/app/query-keys'
import { announce } from '@/components/feedback/announcer'
import { useSession } from '@/features/auth/hooks/use-session'
import { formatEth } from '@/lib/money'
import { nftUpdatedEventSchema, orderUpdatedEventSchema } from '@/schemas/realtime'
import { sessionStore } from '@/services/api/session-store'
import { applyNftUpdated, EventGuard, reconcileActiveQueries } from './apply-event'
import { createSocket, type KurioSocket } from './socket-client'
import { realtimeStatus, useRealtimeStatus } from './status'

/**
 * Ciclo de vida do Socket.IO. Um socket por sessão:
 * login, logout, troca de usuário ou expiração → o socket anterior é desligado e seus listeners
 * liberados; o novo nasce com o token atual. Eventos da sessão anterior nunca chegam à nova.
 */
export function RealtimeProvider() {
  const queryClient = useQueryClient()
  const { status, session } = useSession()
  const userId = status === 'authenticated' ? (session?.user.id ?? null) : null
  const token = status === 'authenticated' ? sessionStore.getAccessToken() : null
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const pathRef = useRef(pathname)
  pathRef.current = pathname

  useEffect(() => {
    let socket: KurioSocket | null = null
    let disposed = false
    const guard = new EventGuard()
    let everConnected = false
    realtimeStatus.set('connecting')

    void createSocket(token).then((created) => {
      if (disposed) return // a sessão mudou enquanto a biblioteca carregava
      socket = created
      wire(created)
      created.connect()
    })

    const wire = (socket: KurioSocket) => {
      socket.on('connect', () => {
        realtimeStatus.set('connected')
        if (everConnected) {
          // Reconexão: o que mudou durante a queda vem da REST (fonte da verdade).
          void reconcileActiveQueries(queryClient)
          announce('Conexão em tempo real restabelecida.')
        }
        everConnected = true
      })
      socket.on('disconnect', (reason) => {
        // "io client disconnect" = nós encerramos (troca de sessão); o resto é queda.
        if (reason !== 'io client disconnect') realtimeStatus.set('reconnecting')
      })
      socket.on('connect_error', () => {
        if (everConnected) realtimeStatus.set('reconnecting')
      })
  
      socket.on('nft.updated', (raw) => {
        const parsed = nftUpdatedEventSchema.safeParse(raw)
        if (!parsed.success || !guard.accept(parsed.data)) return
        const event = parsed.data
        const effect = applyNftUpdated(queryClient, event)
        const name = effect.name ?? 'Um NFT'
  
        if (effect.soldOutInCart.length) {
          toast.warning(`${effect.soldOutInCart.join(', ')} esgotou.`, { description: 'Atualizamos o resumo do seu carrinho.' })
        } else if (effect.inCart && effect.previousPrice && effect.previousPrice !== event.payload.price) {
          toast.info(`Preço atualizado: ${name}`, {
            description: `De ${formatEth(effect.previousPrice)} para ${formatEth(event.payload.price)} ETH. O resumo foi recalculado.`,
          })
        } else if (pathRef.current === `/nfts/${event.payload.nftId}`) {
          announce(`${name} foi atualizado: ${formatEth(event.payload.price)} ETH.`)
        }
      })
  
      socket.on('order.updated', (raw) => {
        const parsed = orderUpdatedEventSchema.safeParse(raw)
        if (!parsed.success) return
        const event = parsed.data
        // Isolamento: evento privado de outro usuário é descartado (defesa em profundidade).
        if (!userId || event.userId !== userId || !guard.accept(event)) return
        const keys = queryKeys.user(userId)
        void queryClient.invalidateQueries({ queryKey: keys.order(event.payload.orderId) })
        void queryClient.invalidateQueries({ queryKey: keys.pendingOrders })
        // Histórico e arquivos dependem do estado do pedido (confirmado libera o download).
        void queryClient.invalidateQueries({ queryKey: keys.activity })
        void queryClient.invalidateQueries({ queryKey: keys.downloads })
        if (event.payload.status === 'confirmed') {
          void queryClient.invalidateQueries({ queryKey: keys.cart }) // os itens comprados saíram
          toast.success('Pagamento confirmado!', { description: 'Seus NFTs estão na sua carteira.' })
        } else if (event.payload.status === 'rejected') {
          toast.error('Pagamento recusado.', { description: event.payload.rejection?.message })
        }
      })
  
      }

    return () => {
      // Libera tudo da sessão que acabou.
      disposed = true
      socket?.removeAllListeners()
      socket?.io.removeAllListeners()
      socket?.disconnect()
      realtimeStatus.set('idle')
    }
  }, [token, userId, queryClient])

  return <RealtimeStatusBanner />
}

/** Aviso discreto (e anunciado) enquanto o tempo real está fora. */
function RealtimeStatusBanner() {
  const status = useRealtimeStatus()
  if (status !== 'reconnecting') return null
  return (
    <p
      role="status"
      data-testid="realtime-offline"
      className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-warning/60 bg-card-elevated px-4 py-2 text-micro shadow-lg md:bottom-6"
    >
      <WifiOff className="size-4 text-warning" aria-hidden="true" />
      Conexão em tempo real perdida. Reconectando…
    </p>
  )
}
