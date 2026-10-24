import type { DecimalString, EditionId, ISODateString, NftId, OrderId } from './common'

/** Seções da conta além de perfil e carteiras: atividade, ofertas, arquivos baixados e suporte. */

export type ActivityType = 'order.created' | 'order.confirmed' | 'order.rejected' | 'download' | 'support.ticket'

/** Linha do histórico. Derivada no servidor de pedidos, downloads e chamados (nada é inventado no cliente). */
export interface ActivityItem {
  id: string
  type: ActivityType
  occurredAt: ISODateString
  title: string
  description: string
  orderId: OrderId | null
}

export type OfferStatus = 'active' | 'expired'

/** Oferta = cupom promocional publicado pela loja. Aplicar usa o mesmo PUT /cart/coupon do carrinho. */
export interface Offer {
  code: string
  title: string
  description: string
  kind: 'percent' | 'fixed'
  /** "10" = 10% · "0.5" = 0.5 ETH (string decimal, como todo valor monetário). */
  value: DecimalString
  status: OfferStatus
  validUntil: ISODateString
}

/** Arte de uma edição comprada (pedido confirmado), disponível para baixar. */
export interface DownloadItem {
  id: string
  orderId: OrderId
  nftId: NftId
  editionId: EditionId
  name: string
  editionLabel: string
  imageUrl: string
  imageAlt: string
  fileName: string
  purchasedAt: ISODateString
  downloadCount: number
  lastDownloadedAt: ISODateString | null
}

export interface DownloadGrant {
  item: DownloadItem
  url: string
  fileName: string
}

export type SupportCategory = 'pedido' | 'pagamento' | 'carteira' | 'conta' | 'outro'
export type SupportTicketStatus = 'open'

export interface SupportTicket {
  id: string
  protocol: string
  category: SupportCategory
  subject: string
  orderId: OrderId | null
  message: string
  status: SupportTicketStatus
  createdAt: ISODateString
}

export interface CreateSupportTicketInput {
  category: SupportCategory
  subject: string
  orderId: OrderId | null
  message: string
}
