import type {
  Blockchain, CartId, CartItemId, EditionId, EthAmount, ISODateString, NftId, QuoteId,
} from './common'

export type QuoteStatus = 'valid' | 'stale' | 'expired'

export type QuoteIssueCode =
  | 'PRICE_CHANGED'
  | 'EDITION_SOLD_OUT'
  | 'INSUFFICIENT_STOCK'
  | 'COUPON_INVALID'
  | 'COUPON_EXPIRED'
  | 'NETWORK_FEE_CHANGED'

export interface QuoteIssue {
  code: QuoteIssueCode
  /** blocking: impede confirmar até o usuário aceitar a nova cotação */
  severity: 'blocking' | 'info'
  cartItemId?: CartItemId
  previous?: string
  current?: string
  message: string
}

export interface QuoteLine {
  cartItemId: CartItemId
  nftId: NftId
  editionId: EditionId
  quantity: number
  unitPrice: EthAmount
  previousUnitPrice: EthAmount | null    // preenchido quando o preço mudou
  lineTotal: EthAmount
  availableQuantity: number | null
}

export interface AppliedCoupon {
  code: string
  kind: 'percent' | 'fixed'
  value: string                          // "10" (%) ou "0.5" (ETH)
}

export interface Quote {
  id: QuoteId
  cartId: CartId
  cartVersion: number
  network: Blockchain
  lines: QuoteLine[]
  subtotal: EthAmount
  discount: EthAmount                    // "0.00" quando não há cupom
  coupon: AppliedCoupon | null
  networkFee: EthAmount
  feeIsEstimate: boolean                 // "Taxa estimada"
  total: EthAmount
  issues: QuoteIssue[]
  status: QuoteStatus
  expiresAt: ISODateString
  createdAt: ISODateString
}

export interface QuoteRequest {
  cartVersion: number
  network: Blockchain
  couponCode?: string | null
}