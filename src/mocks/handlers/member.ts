import { http, HttpResponse } from 'msw'
import { eth } from '@/lib/money'
import { supportTicketInputSchema } from '@/schemas/member'
import type { DownloadGrant, Offer, SupportTicket } from '@/types'
import { apiUrl } from '../api-path'
import { authenticate } from '../auth-guard'
import { withConditions } from '../chaos'
import { mockDb } from '../db/db'
import { activityFor, allDownloadItems, stripOwner } from '../domain/member'
import { COUPONS } from '../fixtures/coupons'
import { settleAndPublish } from '../realtime/hub'
import { apiError, readJson, validationError } from '../http-utils'

/** Atividade, ofertas, arquivos baixados e suporte (seções da sidebar "Meu perfil"). */
export const memberHandlers = [
  http.get(apiUrl('/activity'), withConditions(({ request }) => {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    settleAndPublish() // pedidos vencidos entram no histórico já liquidados
    return HttpResponse.json({ items: activityFor(mockDb.read(), auth.userId) })
  })),

  /** Ofertas = cupons publicados. Exige sessão porque vive na área do colecionador. */
  http.get(apiUrl('/offers'), withConditions(({ request }) => {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    const items: Offer[] = COUPONS.map((c) => ({
      code: c.code,
      title: c.title,
      description: c.description,
      kind: c.kind,
      value: eth(c.value),
      status: c.expired ? 'expired' : 'active',
      validUntil: c.validUntil,
    }))
    return HttpResponse.json({ items })
  })),

  http.get(apiUrl('/downloads'), withConditions(({ request }) => {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    settleAndPublish()
    const items = allDownloadItems(mockDb.read())
      .filter((f) => f.userId === auth.userId)
      .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt))
      .map(stripOwner)
    return HttpResponse.json({ items })
  })),

  /** Registra o download e devolve o endereço do arquivo. Arquivo de outro usuário → 403. */
  http.post(apiUrl('/downloads/:itemId'), withConditions(({ request, params }) => {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    const file = allDownloadItems(mockDb.read()).find((f) => f.id === params.itemId)
    if (!file) return apiError('NOT_FOUND', 'Arquivo não encontrado.', 404)
    if (file.userId !== auth.userId) return apiError('FORBIDDEN', 'Este arquivo pertence a outro colecionador.', 403)

    mockDb.write((db) => { db.downloads.push({ userId: auth.userId, itemId: file.id, at: new Date().toISOString() }) })
    const updated = allDownloadItems(mockDb.read()).find((f) => f.id === file.id)!
    const grant: DownloadGrant = { item: stripOwner(updated), url: updated.imageUrl, fileName: updated.fileName }
    return HttpResponse.json(grant)
  })),

  http.get(apiUrl('/support/tickets'), withConditions(({ request }) => {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    const items = mockDb
      .read()
      .tickets.filter((t) => t.userId === auth.userId)
      .map((t) => t.ticket)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return HttpResponse.json({ items })
  })),

  http.post(apiUrl('/support/tickets'), withConditions(async ({ request }) => {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    const parsed = supportTicketInputSchema.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error)
    const input = parsed.data

    const db = mockDb.read()
    if (input.orderId && !db.orders.some((o) => o.order.id === input.orderId && o.order.userId === auth.userId)) {
      return apiError('VALIDATION_ERROR', 'Verifique os campos destacados.', 422, {
        fieldErrors: { orderId: ['Pedido não encontrado na sua conta.'] },
      })
    }
    const sequence = db.tickets.length + 1
    const ticket: SupportTicket = {
      ...input,
      id: `tkt_${crypto.randomUUID().slice(0, 8)}`,
      protocol: `KUR-${String(1000 + sequence).padStart(6, '0')}`,
      status: 'open',
      createdAt: new Date().toISOString(),
    }
    mockDb.write((draft) => { draft.tickets.push({ userId: auth.userId, ticket }) })
    return HttpResponse.json(ticket, { status: 201 })
  })),
]
