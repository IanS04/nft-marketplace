import { http, HttpResponse } from 'msw'
import { connectWalletSchema, walletInputSchema } from '@/schemas/wallet'
import type { Wallet, WalletConnection, WalletId } from '@/types'
import { apiUrl } from '../api-path'
import { authenticate } from '../auth-guard'
import { withConditions } from '../chaos'
import { mockDb } from '../db/db'
import { apiError, readJson, validationError } from '../http-utils'
import { fireOnce } from '../scenario-flags'
import { getScenario } from '../scenarios'

const ownWallet = (userId: string, id: unknown) =>
  mockDb.read().wallets.find((w) => w.id === id && w.userId === userId)

export const walletHandlers = [
  http.get(apiUrl('/wallets'), withConditions(({ request }) => {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    return HttpResponse.json({ items: mockDb.read().wallets.filter((w) => w.userId === auth.userId) })
  })),

  http.post(apiUrl('/wallets'), withConditions(async ({ request }) => {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    const parsed = walletInputSchema.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error)
    if (mockDb.read().wallets.some((w) => w.userId === auth.userId && w.role === parsed.data.role)) {
      const label = parsed.data.role === 'primary' ? 'principal' : 'secundária'
      return apiError('CONFLICT', `Você já tem uma carteira ${label}. Edite a existente.`, 409)
    }
    const wallet: Wallet = {
      ...parsed.data,
      id: `wal_${crypto.randomUUID().slice(0, 8)}` as WalletId,
      userId: auth.userId,
      updatedAt: new Date().toISOString(),
    }
    mockDb.write((db) => { db.wallets.push(wallet) })
    return HttpResponse.json(wallet, { status: 201 })
  })),

  http.put(apiUrl('/wallets/:walletId'), withConditions(async ({ request, params }) => {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    const parsed = walletInputSchema.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error)
    const current = ownWallet(auth.userId, params.walletId)
    if (!current) return apiError('NOT_FOUND', 'Carteira não encontrada.', 404)
    // O papel (principal/secundária) não muda pela edição.
    const updated: Wallet = { ...current, ...parsed.data, role: current.role, updatedAt: new Date().toISOString() }
    mockDb.write((db) => { db.wallets = db.wallets.map((w) => (w.id === updated.id ? updated : w)) })
    return HttpResponse.json(updated)
  })),

  /** Conexão simulada: conectar (ou recusar, no cenário wallet-rejected). */
  http.post(apiUrl('/wallets/:walletId/connection'), withConditions(async ({ request, params }) => {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    const parsed = connectWalletSchema.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error)
    const wallet = ownWallet(auth.userId, params.walletId)
    if (!wallet) return apiError('NOT_FOUND', 'Carteira não encontrada.', 404)

    const rejected = fireOnce(getScenario().checkout, 'rejectWalletConnection')
    const connection: WalletConnection = {
      walletId: wallet.id,
      ...parsed.data,
      status: rejected ? 'rejected' : 'connected',
      connectedAt: rejected ? null : new Date().toISOString(),
    }
    mockDb.write((db) => { db.walletConnections[wallet.id] = connection })
    if (rejected) return apiError('WALLET_REJECTED', 'A carteira recusou a conexão. Tente novamente.', 409)
    return HttpResponse.json(connection)
  })),

  http.delete(apiUrl('/wallets/:walletId/connection'), withConditions(({ request, params }) => {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    const wallet = ownWallet(auth.userId, params.walletId)
    if (!wallet) return apiError('NOT_FOUND', 'Carteira não encontrada.', 404)
    const connection: WalletConnection = {
      walletId: wallet.id,
      provider: wallet.provider,
      network: wallet.network,
      status: 'disconnected',
      connectedAt: null,
    }
    mockDb.write((db) => { db.walletConnections[wallet.id] = connection })
    return HttpResponse.json(connection)
  })),
]
