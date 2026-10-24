import { cartSchema } from '@/schemas/cart'
import { quoteSchema } from '@/schemas/quote'
import type { AddCartItemInput, Blockchain, Cart, CartItemId, Quote } from '@/types'
import { http } from '../http'

/**
 * Qual carrinho: o do usuário (o token vai pelo interceptor) ou o do visitante,
 * identificado pelo header X-Cart-Id.
 */
export type CartRef = { kind: 'user' } | { kind: 'guest'; guestCartId: string }

const headersFor = (ref: CartRef) => (ref.kind === 'guest' ? { 'X-Cart-Id': ref.guestCartId } : {})
const item = (id: CartItemId) => `/cart/items/${encodeURIComponent(id)}`

export const cartApi = {
  async get(ref: CartRef, signal?: AbortSignal): Promise<Cart> {
    const { data } = await http.get('/cart', { headers: headersFor(ref), signal })
    return cartSchema.parse(data)
  },
  async addItem(ref: CartRef, input: AddCartItemInput): Promise<Cart> {
    const { data } = await http.post('/cart/items', input, { headers: headersFor(ref) })
    return cartSchema.parse(data)
  },
  async updateItem(ref: CartRef, id: CartItemId, quantity: number): Promise<Cart> {
    const { data } = await http.patch(item(id), { quantity }, { headers: headersFor(ref) })
    return cartSchema.parse(data)
  },
  async removeItem(ref: CartRef, id: CartItemId): Promise<Cart> {
    const { data } = await http.delete(item(id), { headers: headersFor(ref) })
    return cartSchema.parse(data)
  },
  async applyCoupon(ref: CartRef, code: string): Promise<Cart> {
    const { data } = await http.put('/cart/coupon', { code }, { headers: headersFor(ref) })
    return cartSchema.parse(data)
  },
  async removeCoupon(ref: CartRef): Promise<Cart> {
    const { data } = await http.delete('/cart/coupon', { headers: headersFor(ref) })
    return cartSchema.parse(data)
  },
  /** Login: leva os itens do carrinho do visitante para o do usuário. */
  async merge(guestCartId: string): Promise<Cart> {
    const { data } = await http.post('/cart/merge', null, { headers: { 'X-Cart-Id': guestCartId } })
    return cartSchema.parse(data)
  },
  async quote(ref: CartRef, network: Blockchain, signal?: AbortSignal): Promise<Quote> {
    const { data } = await http.post('/quote', { network }, { headers: headersFor(ref), signal })
    return quoteSchema.parse(data)
  },
}
