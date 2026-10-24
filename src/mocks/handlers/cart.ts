import { http, HttpResponse } from 'msw'
import { addCartItemSchema, couponRequestSchema, updateCartItemSchema } from '@/schemas/cart'
import { quoteRequestSchema } from '@/schemas/quote'
import type { UserId } from '@/types'
import { apiUrl } from '../api-path'
import { authenticate } from '../auth-guard'
import { withConditions } from '../chaos'
import { mockDb, type CartRecord, type MockDbState } from '../db/db'
import { cartItemId, computeQuote, emptyCart, findEdition, maxQuantityFor, toCart, touch } from '../domain/cart'
import { findCoupon } from '../fixtures/coupons'
import { apiError, readJson, validationError } from '../http-utils'

export const GUEST_CART_HEADER = 'x-cart-id'
const GUEST_ID_RE = /^[A-Za-z0-9-]{8,64}$/
const MAX_STORED_QUOTES = 50

interface CartAccess { key: string; id: string; ownerId: UserId | null }

/**
 * Com Authorization → carrinho do usuário (token inválido = 401).
 * Sem Authorization → carrinho do visitante, identificado pelo header X-Cart-Id.
 */
function resolveCart(request: Request): CartAccess | Response {
  if (request.headers.get('authorization')) {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    return { key: `user:${auth.userId}`, id: `cart_${auth.userId}`, ownerId: auth.userId }
  }
  const guestId = request.headers.get(GUEST_CART_HEADER)
  if (!guestId || !GUEST_ID_RE.test(guestId)) {
    return apiError('VALIDATION_ERROR', 'Identificador do carrinho de visitante ausente ou inválido.', 400)
  }
  return { key: `guest:${guestId}`, id: guestId, ownerId: null }
}

function cartFor(db: MockDbState, access: CartAccess): CartRecord {
  db.carts[access.key] ??= emptyCart(access.id, access.ownerId)
  return db.carts[access.key]!
}

/** Executa uma alteração no carrinho e devolve o carrinho atualizado (ou a Response de erro). */
function mutateCart(
  request: Request,
  change: (cart: CartRecord, db: MockDbState) => Response | void,
): Response {
  const access = resolveCart(request)
  if (access instanceof Response) return access
  // Objeto (e não `let`): o TS não acompanha atribuições feitas dentro do callback.
  const result: { failure?: Response | void } = {}
  mockDb.write((db) => {
    const cart = cartFor(db, access)
    result.failure = change(cart, db)
    if (!result.failure) touch(cart)
  })
  if (result.failure) return result.failure
  const db = mockDb.read()
  return HttpResponse.json(toCart(db, cartFor(db, access)))
}

const availabilityConflict = (max: number) =>
  apiError(
    'AVAILABILITY_CONFLICT',
    max === 0 ? 'Esta edição está esgotada.' : `Você pode ter no máximo ${max} desta edição no carrinho.`,
    409,
    { details: { maxQuantity: max } },
  )

export const cartHandlers = [
  http.get(apiUrl('/cart'), withConditions(({ request }) => {
    const access = resolveCart(request)
    if (access instanceof Response) return access
    const db = mockDb.read()
    return HttpResponse.json(toCart(db, db.carts[access.key] ?? emptyCart(access.id, access.ownerId)))
  })),

  http.post(apiUrl('/cart/items'), withConditions(async ({ request }) => {
    const parsed = addCartItemSchema.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error)
    const { editionId, nftId, quantity } = parsed.data

    return mutateCart(request, (cart, db) => {
      const found = findEdition(db, editionId)
      if (!found || found.nft.id !== nftId) return apiError('NOT_FOUND', 'Edição não encontrada.', 404)
      const max = maxQuantityFor(found.edition)
      const line = cart.lines.find((l) => l.editionId === editionId)
      const total = (line?.quantity ?? 0) + quantity
      if (total > max) return availabilityConflict(max)
      if (line) line.quantity = total
      else cart.lines.push({ editionId, nftId, quantity })
    })
  })),

  http.patch(apiUrl('/cart/items/:itemId'), withConditions(async ({ request, params }) => {
    const parsed = updateCartItemSchema.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error)

    return mutateCart(request, (cart, db) => {
      const line = cart.lines.find((l) => cartItemId(l.editionId) === params.itemId)
      if (!line) return apiError('NOT_FOUND', 'Item não está no carrinho.', 404)
      const found = findEdition(db, line.editionId)
      const max = found ? maxQuantityFor(found.edition) : 0
      if (parsed.data.quantity > max) return availabilityConflict(max)
      line.quantity = parsed.data.quantity
    })
  })),

  // Idempotente: remover um item que já não está lá devolve o carrinho normalmente.
  http.delete(apiUrl('/cart/items/:itemId'), withConditions(({ request, params }) =>
    mutateCart(request, (cart) => {
      cart.lines = cart.lines.filter((l) => cartItemId(l.editionId) !== params.itemId)
    }),
  )),

  http.put(apiUrl('/cart/coupon'), withConditions(async ({ request }) => {
    const parsed = couponRequestSchema.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error)
    const coupon = findCoupon(parsed.data.code)
    if (!coupon) {
      return apiError('COUPON_INVALID', 'Cupom inválido.', 422, { fieldErrors: { code: ['Cupom inválido. Confira o código.'] } })
    }
    if (coupon.expired) {
      return apiError('COUPON_EXPIRED', 'Este cupom expirou.', 422, { fieldErrors: { code: ['Este cupom expirou.'] } })
    }
    return mutateCart(request, (cart) => { cart.couponCode = coupon.code })
  })),

  http.delete(apiUrl('/cart/coupon'), withConditions(({ request }) =>
    mutateCart(request, (cart) => { cart.couponCode = null }),
  )),

  /** Login: junta o carrinho do visitante ao do usuário, respeitando a disponibilidade. */
  http.post(apiUrl('/cart/merge'), withConditions(({ request }) => {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    const guestId = request.headers.get(GUEST_CART_HEADER)
    const userAccess: CartAccess = { key: `user:${auth.userId}`, id: `cart_${auth.userId}`, ownerId: auth.userId }

    mockDb.write((db) => {
      const guest = guestId ? db.carts[`guest:${guestId}`] : undefined
      if (!guest?.lines.length) return
      const cart = cartFor(db, userAccess)
      for (const guestLine of guest.lines) {
        const found = findEdition(db, guestLine.editionId)
        if (!found) continue
        const max = maxQuantityFor(found.edition)
        const line = cart.lines.find((l) => l.editionId === guestLine.editionId)
        const quantity = Math.min((line?.quantity ?? 0) + guestLine.quantity, max)
        if (quantity <= 0) continue
        if (line) line.quantity = quantity
        else cart.lines.push({ ...guestLine, quantity })
      }
      cart.couponCode ??= guest.couponCode
      touch(cart)
      delete db.carts[`guest:${guestId}`]
    })
    const db = mockDb.read()
    return HttpResponse.json(toCart(db, cartFor(db, userAccess)))
  })),

  http.post(apiUrl('/quote'), withConditions(async ({ request }) => {
    const parsed = quoteRequestSchema.safeParse((await readJson(request)) ?? {})
    if (!parsed.success) return validationError(parsed.error)
    const access = resolveCart(request)
    if (access instanceof Response) return access

    const db = mockDb.read()
    const quote = computeQuote(db, db.carts[access.key] ?? emptyCart(access.id, access.ownerId), parsed.data.network)
    // Guardada para o pedido (Etapa 6) conferir que a cotação existe e não expirou.
    mockDb.write((draft) => { draft.quotes = [quote, ...draft.quotes].slice(0, MAX_STORED_QUOTES) })
    return HttpResponse.json(quote)
  })),
]
