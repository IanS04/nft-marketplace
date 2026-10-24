import { userSchema } from '@/schemas/auth'
import { orderListSchema, orderSchema } from '@/schemas/order'
import { walletConnectionSchema, walletListSchema, walletSchema } from '@/schemas/wallet'
import {
  IDEMPOTENCY_HEADER,
  type Blockchain, type ChangePasswordInput, type CreateOrderInput, type Order, type UpdateProfileInput, type User,
  type Wallet, type WalletConnection, type WalletId, type WalletInput, type WalletProvider,
} from '@/types'
import { http } from '../http'

export const walletsApi = {
  async list(signal?: AbortSignal): Promise<Wallet[]> {
    const { data } = await http.get('/wallets', { signal })
    return walletListSchema.parse(data).items
  },
  async create(input: WalletInput): Promise<Wallet> {
    const { data } = await http.post('/wallets', input)
    return walletSchema.parse(data)
  },
  async update(id: WalletId, input: WalletInput): Promise<Wallet> {
    const { data } = await http.put(`/wallets/${encodeURIComponent(id)}`, input)
    return walletSchema.parse(data)
  },
  async connect(id: WalletId, provider: WalletProvider, network: Blockchain): Promise<WalletConnection> {
    const { data } = await http.post(`/wallets/${encodeURIComponent(id)}/connection`, { provider, network })
    return walletConnectionSchema.parse(data)
  },
  async disconnect(id: WalletId): Promise<WalletConnection> {
    const { data } = await http.delete(`/wallets/${encodeURIComponent(id)}/connection`)
    return walletConnectionSchema.parse(data)
  },
}

export const profileApi = {
  async get(signal?: AbortSignal): Promise<User> {
    const { data } = await http.get('/profile', { signal })
    return userSchema.parse(data)
  },
  async update(input: UpdateProfileInput): Promise<User> {
    const { data } = await http.patch('/profile', input)
    return userSchema.parse(data)
  },
  async setAvatar(dataUrl: string): Promise<User> {
    const { data } = await http.put('/profile/avatar', { dataUrl })
    return userSchema.parse(data)
  },
  async removeAvatar(): Promise<User> {
    const { data } = await http.delete('/profile/avatar')
    return userSchema.parse(data)
  },
  async changePassword({ currentPassword, newPassword }: ChangePasswordInput): Promise<void> {
    await http.post('/profile/password', { currentPassword, newPassword })
  },
}

export const ordersApi = {
  /** A chave de idempotência vai no header: reenviar a mesma tentativa nunca duplica o pedido. */
  async create(input: CreateOrderInput, idempotencyKey: string): Promise<Order> {
    const { data } = await http.post('/orders', input, { headers: { [IDEMPOTENCY_HEADER]: idempotencyKey } })
    return orderSchema.parse(data)
  },
  async get(id: string, signal?: AbortSignal): Promise<Order> {
    const { data } = await http.get(`/orders/${encodeURIComponent(id)}`, { signal })
    return orderSchema.parse(data)
  },
  async listPending(signal?: AbortSignal): Promise<Order[]> {
    const { data } = await http.get('/orders', { params: { status: 'pending' }, signal })
    return orderListSchema.parse(data).items
  },
}
