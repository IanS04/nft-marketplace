import { add, compare, eth, mulQty, percentOf, sub, ZERO } from '@/lib/money'
import type {
  Blockchain, Cart, CartId, CartItem, CartItemId, EthAmount, Nft, NftEdition, Quote, QuoteId, QuoteIssue,
} from '@/types'
import type { CartRecord, MockDbState } from '../db/db'
import { findCoupon } from '../fixtures/coupons'

/*
 * Regras de negócio fictícias do carrinho e da cotação (funções puras sobre o banco simulado).
 * Ficam aqui, na camada de mocks: componentes e hooks nunca calculam totais.
 */

/** Taxa de rede estimada (Figma: 0.016 ETH na Ethereum). */
export const NETWORK_FEES: Record<Blockchain, EthAmount> = {
  ethereum: eth('0.016'),
  polygon: eth('0.002'),
  solana: eth('0.001'),
}

export const cartItemId = (editionId: string) => `ci_${editionId}` as CartItemId

export function findEdition(db: MockDbState, editionId: string): { nft: Nft; edition: NftEdition } | null {
  for (const { nft } of db.nfts) {
    const edition = nft.editions.find((e) => e.id === editionId)
    if (edition) return { nft, edition }
  }
  return null
}

/** Quanto desta edição cabe num pedido: limite por pedido e estoque. */
export const maxQuantityFor = (edition: NftEdition) =>
  Math.min(edition.maxPerOrder, edition.available ?? Number.POSITIVE_INFINITY)

export function emptyCart(id: string, ownerId: CartRecord['ownerId']): CartRecord {
  return { id, ownerId, lines: [], couponCode: null, version: 0, updatedAt: new Date().toISOString() }
}

export function touch(cart: CartRecord): void {
  cart.version += 1
  cart.updatedAt = new Date().toISOString()
}

/** Visão do carrinho com preços e disponibilidade ATUAIS do catálogo. */
export function toCart(db: MockDbState, record: CartRecord): Cart {
  const items: CartItem[] = []
  for (const line of record.lines) {
    const found = findEdition(db, line.editionId)
    if (!found) continue
    const { nft, edition } = found
    const max = maxQuantityFor(edition)
    items.push({
      id: cartItemId(edition.id),
      nftId: nft.id,
      editionId: edition.id,
      quantity: line.quantity,
      maxQuantity: max,
      unitPrice: edition.price,
      lineTotal: mulQty(edition.price, line.quantity),
      availability:
        edition.status === 'sold_out' || line.quantity > max ? 'unavailable' : edition.status === 'low_stock' ? 'low_stock' : 'available',
      nft: { name: nft.name, tokenId: nft.tokenId, image: nft.image },
      edition: { label: edition.label },
    })
  }
  return {
    id: record.id as CartId,
    ownerId: record.ownerId,
    items,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    couponCode: record.couponCode,
    version: record.version,
    updatedAt: record.updatedAt,
  }
}

const QUOTE_TTL_MS = 10 * 60_000

/** Cotação = fonte da verdade dos valores: subtotal, desconto, taxa, total e problemas. */
export function computeQuote(db: MockDbState, record: CartRecord, network: Blockchain): Quote {
  const cart = toCart(db, record)
  const issues: QuoteIssue[] = []

  for (const item of cart.items) {
    if (item.availability !== 'unavailable') continue
    const soldOut = item.maxQuantity === 0
    issues.push({
      code: soldOut ? 'EDITION_SOLD_OUT' : 'INSUFFICIENT_STOCK',
      severity: 'blocking',
      cartItemId: item.id,
      current: String(item.maxQuantity),
      message: soldOut
        ? `${item.nft.name} (${item.edition.label}) esgotou.`
        : `${item.nft.name} (${item.edition.label}): só há ${item.maxQuantity} disponíve${item.maxQuantity === 1 ? 'l' : 'is'}.`,
    })
  }

  const subtotal = add(...cart.items.map((i) => i.lineTotal))
  const coupon = record.couponCode ? findCoupon(record.couponCode) : undefined
  let discount = ZERO
  if (record.couponCode && (!coupon || coupon.expired)) {
    issues.push({
      code: coupon ? 'COUPON_EXPIRED' : 'COUPON_INVALID',
      severity: 'blocking',
      message: coupon ? 'O cupom aplicado expirou.' : 'O cupom aplicado não é válido.',
    })
  } else if (coupon) {
    const raw = coupon.kind === 'percent' ? percentOf(subtotal, coupon.value) : eth(coupon.value)
    discount = compare(raw, subtotal) > 0 ? subtotal : raw // desconto nunca passa do subtotal
  }

  const networkFee = cart.items.length ? NETWORK_FEES[network] : ZERO
  const now = Date.now()
  return {
    id: `qt_${crypto.randomUUID().slice(0, 12)}` as QuoteId,
    cartId: cart.id,
    cartVersion: cart.version,
    network,
    lines: cart.items.map((i) => ({
      cartItemId: i.id,
      nftId: i.nftId,
      editionId: i.editionId,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      previousUnitPrice: null,
      lineTotal: i.lineTotal,
      availableQuantity: i.maxQuantity,
    })),
    subtotal,
    discount,
    coupon: coupon && !coupon.expired ? { code: coupon.code, kind: coupon.kind, value: coupon.value } : null,
    networkFee,
    feeIsEstimate: true,
    total: add(sub(subtotal, discount), networkFee),
    issues,
    status: 'valid',
    expiresAt: new Date(now + QUOTE_TTL_MS).toISOString(),
    createdAt: new Date(now).toISOString(),
  }
}
