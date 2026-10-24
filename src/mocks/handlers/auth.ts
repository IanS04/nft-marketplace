import { http, HttpResponse } from 'msw'
import { loginSchema, registerRequestSchema } from '@/schemas/auth'
import type { AuthSession, User, UserId } from '@/types'
import { apiUrl } from '../api-path'
import { authenticate } from '../auth-guard'
import { withConditions } from '../chaos'
import { hashPassword, newSalt, newToken } from '../db/crypto'
import { mockDb, type SessionRecord } from '../db/db'
import { apiError, readJson, validationError } from '../http-utils'

const SESSION_TTL_MS = 30 * 60 * 1000

function openSession(userId: UserId): SessionRecord {
  return { token: newToken(), userId, expiresAt: Date.now() + SESSION_TTL_MS, expired: false, requestCount: 0 }
}

const toAuthSession = (user: User, s: SessionRecord): AuthSession => ({
  user,
  accessToken: s.token,
  expiresAt: new Date(s.expiresAt).toISOString(),
})

export const authHandlers = [
  http.post(apiUrl('/auth/register'), withConditions(async ({ request }) => {
    const parsed = registerRequestSchema.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error)

    const { username, email, password } = parsed.data
    const { users } = mockDb.read()

    const fieldErrors: Record<string, string[]> = {}
    if (users.some((u) => u.user.email === email)) fieldErrors.email = ['Este e-mail já está cadastrado.']
    if (users.some((u) => u.user.username.toLowerCase() === username.toLowerCase())) {
      fieldErrors.username = ['Este nome de usuário já está em uso.']
    }
    if (Object.keys(fieldErrors).length) {
      return apiError('CONFLICT', 'Já existe uma conta com esses dados.', 409, { fieldErrors })
    }

    const now = new Date().toISOString()
    const user: User = {
      id: `usr_${crypto.randomUUID().slice(0, 8)}` as UserId,
      email,
      username,
      displayName: username,
      ensName: null,
      avatarUrl: null,
      createdAt: now,
      updatedAt: now,
    }
    const passwordSalt = newSalt()
    const passwordHash = await hashPassword(password, passwordSalt)
    const session = openSession(user.id)

    mockDb.write((db) => {
      db.users.push({ user, passwordSalt, passwordHash })
      db.sessions.push(session)
    })
    return HttpResponse.json(toAuthSession(user, session), { status: 201 })
  })),

  http.post(apiUrl('/auth/login'), withConditions(async ({ request }) => {
    const parsed = loginSchema.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error)

    const { email, password } = parsed.data
    const record = mockDb.read().users.find((u) => u.user.email === email)
    const hash = record ? await hashPassword(password, record.passwordSalt) : null
    if (!record || hash !== record.passwordHash) {
      return apiError('INVALID_CREDENTIALS', 'E-mail ou senha incorretos.', 401)
    }

    const session = openSession(record.user.id)
    mockDb.write((db) => { db.sessions.push(session) })
    return HttpResponse.json(toAuthSession(record.user, session))
  })),

  http.get(apiUrl('/auth/session'), withConditions(({ request }) => {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    const user = mockDb.read().users.find((u) => u.user.id === auth.userId)?.user
    if (!user) return apiError('UNAUTHENTICATED', 'Sessão inválida.', 401)
    const session = mockDb.read().sessions.find((s) => s.token === auth.token)!
    return HttpResponse.json({ user, expiresAt: new Date(session.expiresAt).toISOString() })
  })),

  http.post(apiUrl('/auth/logout'), withConditions(({ request }) => {
    const header = request.headers.get('authorization')
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null
    if (token) mockDb.write((db) => { db.sessions = db.sessions.filter((s) => s.token !== token) })
    return new HttpResponse(null, { status: 204 })
  })),
]