import { eth } from '@/lib/money'
import type { EditionId, Nft, NftUpdatedEvent, Order, OrderUpdatedEvent, UserId } from '@/types'
import { mockDb } from '../db/db'
import { settleDueOrders } from '../domain/orders'

/*
 * "Servidor" Socket.IO simulado. Mantém as conexões abertas e publica eventos quando os dados
 * do banco simulado mudam: a mesma mudança aparece na REST e no socket.
 */

export interface Peer {
  /** Usuário autenticado pelo token do pacote CONNECT (null = visitante). */
  userId: UserId | null
  emit: (event: 'nft.updated' | 'order.updated', payload: unknown) => void
  close: () => void
}

const peers = new Set<Peer>()
let online = true
let lastNftEvent: NftUpdatedEvent | null = null

export const realtimeHub = {
  add(peer: Peer) { peers.add(peer) },
  remove(peer: Peer) { peers.delete(peer) },
  isOnline: () => online,
  /** Simula queda do servidor: fecha as conexões e recusa novas até voltar. */
  setOnline(value: boolean) {
    online = value
    if (!value) [...peers].forEach((p) => p.close())
  },
  peerCount: () => peers.size,
  reset() {
    online = true
    lastNftEvent = null
  },
}

const envelope = () => ({ eventId: crypto.randomUUID(), occurredAt: new Date().toISOString() })

export function nftEvent(nft: Nft): NftUpdatedEvent {
  return {
    ...envelope(),
    type: 'nft.updated',
    resource: { type: 'nft', id: nft.id },
    version: nft.version,
    payload: {
      nftId: nft.id,
      price: nft.price,
      compareAtPrice: nft.compareAtPrice,
      editions: nft.editions.map((e) => ({ id: e.id, price: e.price, available: e.available, status: e.status })),
    },
  }
}

/** nft.updated é público: vai para todas as conexões. */
export function sendNftEvent(event: NftUpdatedEvent): void {
  lastNftEvent = event
  peers.forEach((p) => p.emit('nft.updated', event))
}

export function publishNft(nftId: string): void {
  const record = mockDb.read().nfts.find((r) => r.nft.id === nftId)
  if (record) sendNftEvent(nftEvent(record.nft))
}

/** order.updated é privado: só para as conexões do dono do pedido. */
export function publishOrder(order: Order): void {
  const event: OrderUpdatedEvent = {
    ...envelope(),
    type: 'order.updated',
    resource: { type: 'order', id: order.id },
    version: order.version,
    userId: order.userId,
    payload: {
      orderId: order.id,
      status: order.status,
      transactionId: order.transactionId,
      rejection: order.rejection,
    },
  }
  peers.forEach((p) => { if (p.userId === order.userId) p.emit('order.updated', event) })
}

/** Liquida pedidos vencidos e publica: order.updated (dono) + nft.updated (estoque devolvido). */
export function settleAndPublish(): void {
  let settled: ReturnType<typeof settleDueOrders> = []
  mockDb.write((db) => { settled = settleDueOrders(db) })
  for (const record of settled) {
    publishOrder(record.order)
    new Set(record.order.items.map((i) => i.nftId)).forEach(publishNft)
  }
}

/* ---------- Mudanças disparadas por testes/demonstração (window.__kurioMocks.realtime) ---------- */

/** Novo preço para todas as edições do NFT (sobe a versão e publica). */
export function setNftPrice(db: ReturnType<typeof mockDb.read>, nftId: string, price: string): Nft | null {
  const record = db.nfts.find((r) => r.nft.id === nftId)
  if (!record) return null
  const value = eth(price)
  record.nft.price = value
  record.nft.editions.forEach((e) => { e.price = value })
  record.nft.version += 1
  record.nft.updatedAt = new Date().toISOString()
  return record.nft
}

export const realtimeControls = {
  changePrice(nftId: string, price: string) {
    mockDb.write((db) => { setNftPrice(db, nftId, price) })
    publishNft(nftId)
  },
  changeStock(editionId: string, available: number) {
    let nftId: string | null = null
    mockDb.write((db) => {
      for (const record of db.nfts) {
        const edition = record.nft.editions.find((e) => e.id === (editionId as EditionId))
        if (!edition) continue
        edition.available = available
        edition.status = available === 0 ? 'sold_out' : available <= 3 ? 'low_stock' : 'available'
        record.nft.version += 1
        nftId = record.nft.id
      }
    })
    if (nftId) publishNft(nftId)
  },
  /** Reenvia o último nft.updated (mesmo eventId): o cliente deve ignorar o duplicado. */
  replayLast() {
    if (lastNftEvent) peers.forEach((p) => p.emit('nft.updated', lastNftEvent))
  },
  /** Evento ANTIGO (versão menor que a atual) com outro preço: o cliente não pode regredir. */
  emitStale(nftId: string, price: string) {
    const record = mockDb.read().nfts.find((r) => r.nft.id === nftId)
    if (!record) return
    const stale = nftEvent({ ...record.nft, price: eth(price), version: Math.max(1, record.nft.version - 1) })
    peers.forEach((p) => p.emit('nft.updated', stale))
  },
  /** order.updated forjado para outro usuário enviado a TODAS as conexões: o cliente deve descartar. */
  emitForeignOrder(userId: string) {
    const event: OrderUpdatedEvent = {
      ...envelope(),
      type: 'order.updated',
      resource: { type: 'order', id: 'ord_alheio' },
      version: 2,
      userId: userId as UserId,
      payload: { orderId: 'ord_alheio' as Order['id'], status: 'confirmed', transactionId: '0xabc', rejection: null },
    }
    peers.forEach((p) => p.emit('order.updated', event))
  },
  setOnline: (value: boolean) => realtimeHub.setOnline(value),
  peerCount: () => realtimeHub.peerCount(),
}

/** Relógio da rede simulada: liquida pedidos mesmo sem ninguém consultar a REST. */
let ticker: ReturnType<typeof setInterval> | undefined
export function startSettlementTicker(): void {
  clearInterval(ticker)
  ticker = setInterval(settleAndPublish, 250)
}
