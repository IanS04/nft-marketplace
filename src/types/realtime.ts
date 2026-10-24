import type { EditionId, EthAmount, ISODateString, NftId, OrderId, UserId } from './common'
import type { EditionStatus } from './nft'
import type { OrderRejectionReason, OrderStatus } from './order'

export const SOCKET_EVENTS = {
  nftUpdated: 'nft.updated',
  orderUpdated: 'order.updated',
} as const

/** Envelope: identidade estável + recurso + versão (dedupe e ordenação no cliente). */
export interface RealtimeEnvelope<TType extends string, TResource extends string, TPayload> {
  eventId: string
  type: TType
  resource: { type: TResource; id: string }
  version: number
  occurredAt: ISODateString
  /** Presente em eventos privados; o cliente descarta se não for o usuário da sessão atual. */
  userId?: UserId
  payload: TPayload
}

export type NftUpdatedEvent = RealtimeEnvelope<'nft.updated', 'nft', {
  nftId: NftId
  price: EthAmount
  compareAtPrice: EthAmount | null
  editions: { id: EditionId; price: EthAmount; available: number | null; status: EditionStatus }[]
}>

export type OrderUpdatedEvent = RealtimeEnvelope<'order.updated', 'order', {
  orderId: OrderId
  status: OrderStatus
  transactionId: string | null
  rejection: { reason: OrderRejectionReason; message: string } | null
}>

export interface SubscriptionRequest {
  resource: 'nft' | 'order' | 'cart'
  ids: string[]
}

export interface ServerToClientEvents {
  'nft.updated': (event: NftUpdatedEvent) => void
  'order.updated': (event: OrderUpdatedEvent) => void
}

export interface ClientToServerEvents {
  subscribe: (req: SubscriptionRequest, ack?: (ok: boolean) => void) => void
  unsubscribe: (req: SubscriptionRequest) => void
}