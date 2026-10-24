import type { NftId, NftListQuery, UserId } from '@/types'

export const queryKeys = {
  session: ['session'] as const,

  nfts: {
    all: ['nfts'] as const,
    lists: () => ['nfts', 'list'] as const,
    list: (query: NftListQuery) => ['nfts', 'list', query] as const,
    featured: () => ['nfts', 'featured'] as const,
    detail: (id: NftId) => ['nfts', 'detail', id] as const,
  },

  /** Todo dado privado vive sob ['user', userId, …]: limpar o prefixo ['user'] isola usuários. */
  user: (userId: UserId) => ({
    root: ['user', userId] as const,
    session: ['user', userId, 'session'] as const,
    favorites: ['user', userId, 'favorites'] as const,
    cart: ['user', userId, 'cart'] as const,
    wallets: ['user', userId, 'wallets'] as const,
    profile: ['user', userId, 'profile'] as const,
    orders: ['user', userId, 'orders'] as const,
    pendingOrders: ['user', userId, 'orders', 'pending'] as const,
    order: (orderId: string) => ['user', userId, 'orders', 'detail', orderId] as const,
  }),

  /** Carrinho do visitante: público, identificado pelo id guardado no navegador. */
  guestCart: (guestCartId: string) => ['cart', 'guest', guestCartId] as const,

  /** A cotação vive "dentro" do carrinho e muda a cada versão dele. */
  quote: (cartKey: readonly unknown[], cartVersion: number, network: string) =>
    [...cartKey, 'quote', cartVersion, network] as const,
} as const

export const PRIVATE_CACHE_PREFIX = ['user'] as const