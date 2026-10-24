import type { EditionId, Nft, NftId, Order, Quote, SupportTicket, User, UserId, Wallet, WalletConnection } from '@/types'
import { buildSeed } from './seed'

export const DB_STORAGE_KEY = 'kurio:mock-db:v1'
const SCHEMA_VERSION = 6 // v6: downloads e chamados de suporte. Mudou o formato? Incremente: o banco salvo é descartado e ressemeado.

export interface UserRecord { user: User; passwordSalt: string; passwordHash: string }
export interface SessionRecord {
  token: string
  userId: UserId
  expiresAt: number
  expired: boolean
  requestCount: number
}
export interface NftRecord { nft: Nft; listedAt: number; popularity: number }

export interface CartLineRecord { editionId: EditionId; nftId: NftId; quantity: number }
export interface CartRecord {
  id: string
  ownerId: UserId | null
  lines: CartLineRecord[]
  couponCode: string | null
  version: number
  updatedAt: string
}

export interface OrderRecord {
  order: Order
  /** Momento (ms) em que a rede simulada liquida o pedido. */
  settleAt: number
  outcome: 'confirmed' | 'rejected'
  /** Estoque reservado na criação: devolvido se o pagamento for recusado. */
  reserved: { editionId: EditionId; quantity: number }[]
}

/** Cada download de arte comprada (alimenta "Arquivos baixados" e "Atividade"). */
export interface DownloadRecord { userId: UserId; itemId: string; at: string }
export interface SupportTicketRecord { userId: UserId; ticket: SupportTicket }

export type CatalogKind = 'full' | 'empty'

export interface MockDbState {
  schemaVersion: typeof SCHEMA_VERSION
  seedKind: CatalogKind
  users: UserRecord[]
  sessions: SessionRecord[]
  nfts: NftRecord[]
  favorites: Record<string, NftId[]>
  /** Chave: "user:<userId>" ou "guest:<guestCartId>". */
  carts: Record<string, CartRecord>
  quotes: Quote[]
  wallets: Wallet[]
  /** Conexão simulada por carteira (conectar / recusar / desconectar). */
  walletConnections: Record<string, WalletConnection>
  orders: OrderRecord[]
  /** "<userId>:<Idempotency-Key>" → impressão digital do corpo + pedido criado. */
  idempotency: Record<string, { fingerprint: string; orderId: string }>
  downloads: DownloadRecord[]
  tickets: SupportTicketRecord[]
}

export { SCHEMA_VERSION }

let state: MockDbState | null = null

function load(): MockDbState | null {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as MockDbState
    return parsed.schemaVersion === SCHEMA_VERSION ? parsed : null
  } catch {
    return null
  }
}

function persist() {
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(state))
  } catch { /* quota/modo privado: segue só em memória */ }
}

export const mockDb = {
  /** Reaproveita o estado persistido (sobrevive a refresh) se o tipo de catálogo for o mesmo. */
  async init(kind: CatalogKind): Promise<void> {
    const stored = load()
    state = stored && stored.seedKind === kind ? stored : await buildSeed(kind)
    persist()
  },

  read(): MockDbState {
    if (!state) throw new Error('mockDb não inicializado: chame mockDb.init() antes de iniciar o worker.')
    return state
  },

  write(mutator: (draft: MockDbState) => void): void {
    mutator(mockDb.read())
    persist()
  },

  /** Restaura integralmente o estado conhecido do cenário. */
  async reset(kind: CatalogKind): Promise<void> {
    try { localStorage.removeItem(DB_STORAGE_KEY) } catch { /* ignora */ }
    state = await buildSeed(kind)
    persist()
  },
}