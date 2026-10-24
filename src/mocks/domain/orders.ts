import type { EditionId, EditionStatus } from '@/types'
import type { MockDbState, OrderRecord } from '../db/db'
import { touch } from './cart'

/** Tempo até a "rede" simulada liquidar o pedido (pendente → confirmado/recusado). */
export const DEFAULT_SETTLE_MS = 2_000
let settleDelayMs = DEFAULT_SETTLE_MS
/** Testes alongam o prazo para observar o pedido pendente (ex.: queda de conexão no meio). */
export const getSettleDelay = () => settleDelayMs
export const setSettleDelay = (ms: number) => { settleDelayMs = ms }

const statusOf = (available: number | null): EditionStatus =>
  available === null ? 'available' : available === 0 ? 'sold_out' : available <= 3 ? 'low_stock' : 'available'

/** Altera o estoque de uma edição (negativo = reserva). Sobe a versão do NFT (base do nft.updated, Etapa 7). */
export function adjustStock(db: MockDbState, editionId: EditionId, delta: number): void {
  for (const record of db.nfts) {
    const edition = record.nft.editions.find((e) => e.id === editionId)
    if (!edition) continue
    if (edition.available !== null) {
      edition.available = Math.max(0, edition.available + delta)
      edition.status = statusOf(edition.available)
    }
    record.nft.version += 1
    record.nft.updatedAt = new Date().toISOString()
    return
  }
}

/** Hash de transação fictício e determinístico (mesmo pedido → mesmo hash). */
export function fakeTxHash(seed: string): string {
  let h = 0x811c9dc5
  let out = ''
  while (out.length < 64) {
    for (const ch of seed + out.length) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0
    out += h.toString(16).padStart(8, '0')
  }
  return `0x${out.slice(0, 64)}`
}

/** Confirmado: sai do carrinho SÓ o que foi comprado (itens e quantidades do snapshot). */
function removePurchased(db: MockDbState, record: OrderRecord): void {
  const cart = db.carts[`user:${record.order.userId}`]
  if (!cart) return
  for (const item of record.order.items) {
    const line = cart.lines.find((l) => l.editionId === item.editionId)
    if (line) line.quantity -= item.quantity
  }
  cart.lines = cart.lines.filter((l) => l.quantity > 0)
  if (record.order.couponCode && cart.couponCode === record.order.couponCode) cart.couponCode = null
  touch(cart)
}

/**
 * Liquidação "preguiçosa": a cada leitura, pedidos com prazo vencido viram terminais.
 * Confirmado e recusado são estados finais: nunca mudam de novo.
 */
export function settleDueOrders(db: MockDbState, now = Date.now()): OrderRecord[] {
  const settled: OrderRecord[] = []
  for (const record of db.orders) {
    const pending = record.order
    if (pending.status !== 'pending' || record.settleAt > now) continue
    const updatedAt = new Date(now).toISOString()
    const version = pending.version + 1

    if (record.outcome === 'confirmed') {
      const transactionId = fakeTxHash(pending.id)
      record.order = {
        ...pending,
        status: 'confirmed',
        transactionId,
        explorerUrl: `https://explorer.kurio.dev/tx/${transactionId}`, // explorador simulado (não existe)
        confirmedAt: updatedAt,
        rejection: null,
        updatedAt,
        version,
      }
      removePurchased(db, record)
    } else {
      record.order = {
        ...pending,
        status: 'rejected',
        transactionId: null,
        rejection: { reason: 'PAYMENT_DECLINED', message: 'O pagamento foi recusado pela carteira. Nenhum valor foi cobrado.' },
        updatedAt,
        version,
      }
      record.reserved.forEach((r) => adjustStock(db, r.editionId, r.quantity)) // devolve o estoque
    }
    settled.push(record)
  }
  return settled
}
