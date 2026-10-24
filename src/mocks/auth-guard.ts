import type { UserId } from '@/types'
import { mockDb } from './db/db'
import { apiError } from './http-utils'
import { getScenario } from './scenarios'

export interface AuthContext { userId: UserId; token: string }

/** Devolve o contexto do usuário ou a Response de erro (401) pronta para retornar. */
export function authenticate(request: Request): AuthContext | Response {
  const header = request.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return apiError('UNAUTHENTICATED', 'Faça login para continuar.', 401)

  const record = mockDb.read().sessions.find((s) => s.token === token)
  if (!record) return apiError('UNAUTHENTICATED', 'Sessão inválida. Entre novamente.', 401)

  const expiredResponse = () => apiError('SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.', 401)
  if (record.expired || record.expiresAt <= Date.now()) return expiredResponse()

  const limit = getScenario().auth.expireAfterRequests
  const count = record.requestCount + 1
  if (limit !== undefined && count > limit) {
    mockDb.write((db) => {
      const s = db.sessions.find((x) => x.token === token)
      if (s) s.expired = true
    })
    return expiredResponse()
  }

  mockDb.write((db) => {
    const s = db.sessions.find((x) => x.token === token)
    if (s) s.requestCount = count
  })
  return { userId: record.userId, token }
}