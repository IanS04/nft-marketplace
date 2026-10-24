import { formatEth } from '@/lib/money'
import type { ActivityItem, ConfirmedOrder, DownloadItem, UserId } from '@/types'
import type { MockDbState } from '../db/db'

/** Id estável de um arquivo comprado: um por edição de cada pedido confirmado. */
export const downloadItemId = (orderId: string, editionId: string) => `dl_${orderId}__${editionId}`

const fileNameOf = (imageUrl: string, name: string, editionLabel: string) => {
  const ext = imageUrl.split('.').pop() ?? 'webp'
  const slug = `${name}-${editionLabel}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${slug}.${ext}`
}

/**
 * Arquivos de TODOS os pedidos confirmados (de qualquer usuário). Quem chama filtra pelo dono:
 * assim o handler distingue "não existe" (404) de "é de outro usuário" (403).
 */
export function allDownloadItems(db: MockDbState): (DownloadItem & { userId: UserId })[] {
  const confirmed = db.orders.map((r) => r.order).filter((o): o is ConfirmedOrder => o.status === 'confirmed')
  return confirmed.flatMap((order) =>
    order.items.map((item) => {
      const id = downloadItemId(order.id, item.editionId)
      const history = db.downloads.filter((d) => d.itemId === id)
      return {
        id,
        userId: order.userId,
        orderId: order.id,
        nftId: item.nftId,
        editionId: item.editionId,
        name: item.name,
        editionLabel: item.editionLabel,
        imageUrl: item.imageUrl,
        imageAlt: item.imageAlt,
        fileName: fileNameOf(item.imageUrl, item.name, item.editionLabel),
        purchasedAt: order.confirmedAt,
        downloadCount: history.length,
        lastDownloadedAt: history.at(-1)?.at ?? null,
      }
    }),
  )
}

/** Remove o dono antes de responder (o contrato público não expõe userId). */
export function stripOwner(file: DownloadItem & { userId: UserId }): DownloadItem {
  const item: DownloadItem & { userId?: UserId } = { ...file }
  delete item.userId
  return item
}

const itemsLabel = (count: number) => (count === 1 ? '1 item' : `${count} itens`)

/** Histórico do usuário, montado a partir do que realmente aconteceu no banco simulado. */
export function activityFor(db: MockDbState, userId: UserId): ActivityItem[] {
  const items: ActivityItem[] = []

  for (const { order } of db.orders) {
    if (order.userId !== userId) continue
    const count = order.items.reduce((sum, i) => sum + i.quantity, 0)
    items.push({
      id: `act_${order.id}_created`,
      type: 'order.created',
      occurredAt: order.createdAt,
      title: 'Pedido enviado',
      description: `${itemsLabel(count)} · ${formatEth(order.total)} ETH`,
      orderId: order.id,
    })
    if (order.status === 'confirmed') {
      items.push({
        id: `act_${order.id}_confirmed`,
        type: 'order.confirmed',
        occurredAt: order.confirmedAt,
        title: 'Pagamento confirmado',
        description: order.items.map((i) => i.name).join(', '),
        orderId: order.id,
      })
    } else if (order.status === 'rejected') {
      items.push({
        id: `act_${order.id}_rejected`,
        type: 'order.rejected',
        occurredAt: order.updatedAt,
        title: 'Pagamento recusado',
        description: order.rejection.message,
        orderId: order.id,
      })
    }
  }

  const files = new Map(allDownloadItems(db).map((f) => [f.id, f]))
  db.downloads.forEach((d, index) => {
    if (d.userId !== userId) return
    const file = files.get(d.itemId)
    items.push({
      id: `act_download_${index}`,
      type: 'download',
      occurredAt: d.at,
      title: 'Arquivo baixado',
      description: file ? `${file.name} (${file.editionLabel})` : 'Arte de NFT comprado',
      orderId: file?.orderId ?? null,
    })
  })

  for (const { userId: owner, ticket } of db.tickets) {
    if (owner !== userId) continue
    items.push({
      id: `act_${ticket.id}`,
      type: 'support.ticket',
      occurredAt: ticket.createdAt,
      title: `Chamado ${ticket.protocol} aberto`,
      description: ticket.subject,
      orderId: ticket.orderId,
    })
  }

  return items.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
}
