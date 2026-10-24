import { delay, http, HttpResponse } from 'msw'
import { stableStringify } from '@/lib/idempotency'
import { compare, markup } from '@/lib/money'
import { createOrderSchema } from '@/schemas/order'
import { IDEMPOTENCY_HEADER, type OrderId, type PendingOrder } from '@/types'
import { apiUrl } from '../api-path'
import { authenticate } from '../auth-guard'
import { withConditions } from '../chaos'
import { mockDb } from '../db/db'
import { computeQuote, findEdition } from '../domain/cart'
import { adjustStock, getSettleDelay } from '../domain/orders'
import { publishNft, setNftPrice, settleAndPublish } from '../realtime/hub'
import { apiError, readJson, validationError } from '../http-utils'
import { fireOnce } from '../scenario-flags'
import { getScenario } from '../scenarios'

export const orderHandlers = [
  http.post(apiUrl('/orders'), withConditions(async ({ request }) => {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth

    const key = request.headers.get(IDEMPOTENCY_HEADER)
    if (!key || key.length < 8) return apiError('VALIDATION_ERROR', `Cabeçalho ${IDEMPOTENCY_HEADER} obrigatório.`, 400)
    const parsed = createOrderSchema.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error)
    const input = parsed.data

    // Idempotência: mesma chave + mesmo conteúdo → o MESMO pedido; conteúdo diferente → conflito.
    const idemKey = `${auth.userId}:${key}`
    const fingerprint = stableStringify(input)
    settleAndPublish()
    const existing = mockDb.read().idempotency[idemKey]
    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        return apiError('IDEMPOTENCY_CONFLICT', 'Esta chave de idempotência já foi usada com outro conteúdo.', 409)
      }
      const record = mockDb.read().orders.find((o) => o.order.id === existing.orderId)
      if (record) return HttpResponse.json(record.order, { status: 200 })
    }

    const behavior = getScenario().checkout
    const cartRecord = mockDb.read().carts[`user:${auth.userId}`]
    if (!cartRecord?.lines.length) return apiError('CONFLICT', 'Seu carrinho está vazio.', 409)

    // Cenários: o catálogo muda "durante a compra" (entre a cotação vista e a confirmação).
    const firstLine = cartRecord.lines[0]!
    // A mudança vai para o banco E para o socket (nft.updated), como num servidor real.
    if (fireOnce(behavior, 'priceChangeOnOrder')) {
      mockDb.write((db) => {
        const found = findEdition(db, firstLine.editionId)
        if (found) setNftPrice(db, found.nft.id, markup(found.edition.price, 10))
      })
      publishNft(firstLine.nftId)
    }
    if (fireOnce(behavior, 'soldOutOnOrder')) {
      mockDb.write((db) => {
        const found = findEdition(db, firstLine.editionId)
        if (found) adjustStock(db, firstLine.editionId, -(found.edition.available ?? 0))
      })
      publishNft(firstLine.nftId)
    }

    // Revalidação: a cotação confirmada precisa bater com a situação atual.
    const db = mockDb.read()
    const quote = db.quotes.find((q) => q.id === input.quoteId)
    const fresh = computeQuote(db, cartRecord, input.network)
    if (fresh.issues.some((i) => i.severity === 'blocking')) {
      return apiError('AVAILABILITY_CONFLICT', fresh.issues.map((i) => i.message).join(' '), 409, { details: { issues: fresh.issues } })
    }
    const stale =
      !quote ||
      quote.cartId !== cartRecord.id ||
      Date.parse(quote.expiresAt) < Date.now() ||
      input.cartVersion !== cartRecord.version ||
      quote.network !== input.network ||
      compare(quote.total, fresh.total) !== 0
    if (!quote || stale) {
      return apiError('QUOTE_STALE', 'Os valores mudaram desde a sua revisão. Confira e confirme novamente.', 409, {
        details: { previousTotal: quote?.total ?? null, currentTotal: fresh.total },
      })
    }

    const wallet = db.wallets.find((w) => w.id === input.walletId && w.userId === auth.userId)
    if (!wallet) return apiError('NOT_FOUND', 'Carteira não encontrada.', 404)
    const connection = db.walletConnections[wallet.id]
    if (connection?.status !== 'connected' || connection.provider !== input.provider) {
      return apiError('CONFLICT', 'Conecte a carteira antes de confirmar a compra.', 409)
    }

    const now = new Date()
    const order: PendingOrder = {
      id: `ord_${crypto.randomUUID().slice(0, 12)}` as OrderId,
      userId: auth.userId,
      quoteId: quote.id,
      // Snapshot: o recibo não muda mesmo que o catálogo mude depois.
      items: fresh.lines.map((line) => {
        const found = findEdition(db, line.editionId)!
        return {
          nftId: line.nftId,
          editionId: line.editionId,
          name: found.nft.name,
          tokenId: found.nft.tokenId,
          imageUrl: found.nft.image.url,
          imageAlt: found.nft.image.alt,
          editionLabel: found.edition.label,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
        }
      }),
      subtotal: fresh.subtotal,
      discount: fresh.discount,
      couponCode: fresh.coupon?.code ?? null,
      networkFee: fresh.networkFee,
      total: fresh.total,
      network: input.network,
      walletId: wallet.id,
      walletProvider: input.provider,
      walletAddress: wallet.address,
      collector: input.collector,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      version: 1,
      status: 'pending',
      transactionId: null,
      rejection: null,
    }

    mockDb.write((draft) => {
      order.items.forEach((item) => adjustStock(draft, item.editionId, -item.quantity)) // reserva
      draft.orders.push({
        order,
        settleAt: now.getTime() + getSettleDelay(),
        outcome: behavior.declinePayment ? 'rejected' : 'confirmed',
        reserved: order.items.map((i) => ({ editionId: i.editionId, quantity: i.quantity })),
      })
      draft.idempotency[idemKey] = { fingerprint, orderId: order.id }
    })
    // Estoque reservado: catálogo, detalhe e carrinhos abertos recebem a nova disponibilidade.
    new Set(order.items.map((i) => i.nftId)).forEach(publishNft)

    // order-timeout: o pedido JÁ existe, mas a resposta nunca chega. O reenvio com a mesma chave o recupera.
    if (fireOnce(behavior, 'timeoutAfterCreate')) await delay('infinite')

    return HttpResponse.json(order, { status: 201 })
  })),

  /** Pedidos do usuário (ex.: ?status=pending para retomar uma compra em andamento). */
  http.get(apiUrl('/orders'), withConditions(({ request }) => {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    settleAndPublish()
    const status = new URL(request.url).searchParams.get('status')
    const items = mockDb
      .read()
      .orders.map((o) => o.order)
      .filter((o) => o.userId === auth.userId && (!status || o.status === status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return HttpResponse.json({ items })
  })),

  http.get(apiUrl('/orders/:orderId'), withConditions(({ request, params }) => {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    settleAndPublish()
    const record = mockDb.read().orders.find((o) => o.order.id === params.orderId)
    // Pedido de outro usuário responde como inexistente: não revela nem que existe.
    if (!record || record.order.userId !== auth.userId) return apiError('NOT_FOUND', 'Pedido não encontrado.', 404)
    return HttpResponse.json(record.order)
  })),
]
