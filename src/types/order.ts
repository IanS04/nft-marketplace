import type {
  Blockchain, EditionId, EthAmount, ISODateString, NftId, OrderId, QuoteId, UserId, WalletId,
} from './common'
import type { WalletProvider } from './wallet'

export type OrderStatus = 'pending' | 'confirmed' | 'rejected'

export type OrderRejectionReason =
  | 'PAYMENT_DECLINED'
  | 'WALLET_REJECTED'
  | 'PRICE_CHANGED'
  | 'EDITION_SOLD_OUT'

/** Snapshot imutável: alterações posteriores no catálogo não afetam o recibo. */
export interface OrderItemSnapshot {
  nftId: NftId
  editionId: EditionId
  name: string
  tokenId: string
  imageUrl: string
  imageAlt: string
  editionLabel: string
  quantity: number
  unitPrice: EthAmount
  lineTotal: EthAmount
}

export interface CollectorDetails {
  displayName: string
  username: string
  email: string
  profileName: string
  referralCode: string
  ensName: string | null
  note?: string
}

interface OrderBase {
  id: OrderId
  userId: UserId
  quoteId: QuoteId
  items: OrderItemSnapshot[]
  subtotal: EthAmount
  discount: EthAmount
  couponCode: string | null
  networkFee: EthAmount
  total: EthAmount
  network: Blockchain
  walletId: WalletId
  walletProvider: WalletProvider
  walletAddress: string
  collector: CollectorDetails
  createdAt: ISODateString
  updatedAt: ISODateString
  version: number                        // guarda de eventos order.updated
}

export interface PendingOrder extends OrderBase {
  status: 'pending'
  transactionId: null
  rejection: null
}

export interface ConfirmedOrder extends OrderBase {
  status: 'confirmed'
  transactionId: string                  // "0xA91F…E82C" (simulado)
  explorerUrl: string                    // "Ver no Etherscan" (simulado)
  confirmedAt: ISODateString
  rejection: null
}

export interface RejectedOrder extends OrderBase {
  status: 'rejected'
  transactionId: null
  rejection: { reason: OrderRejectionReason; message: string }
}

export type Order = PendingOrder | ConfirmedOrder | RejectedOrder
export type OrderReceipt = ConfirmedOrder   // só pedido confirmado exibe recibo

export interface CreateOrderInput {
  quoteId: QuoteId
  cartVersion: number
  walletId: WalletId
  provider: WalletProvider
  network: Blockchain
  collector: CollectorDetails
}
// A chave de idempotência vai no header IDEMPOTENCY_HEADER, não no corpo.