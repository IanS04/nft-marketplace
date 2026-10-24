import { http, HttpResponse } from 'msw'
import { avatarRequestSchema, changePasswordRequestSchema, updateProfileSchema } from '@/schemas/profile'
import type { User } from '@/types'
import { apiUrl } from '../api-path'
import { authenticate } from '../auth-guard'
import { withConditions } from '../chaos'
import { hashPassword, newSalt } from '../db/crypto'
import { mockDb } from '../db/db'
import { apiError, readJson, validationError } from '../http-utils'

const findUser = (id: string) => mockDb.read().users.find((u) => u.user.id === id)

function updateUser(id: string, patch: Partial<User>): User {
  let next: User | undefined
  mockDb.write((db) => {
    const record = db.users.find((u) => u.user.id === id)
    if (!record) return
    record.user = { ...record.user, ...patch, updatedAt: new Date().toISOString() }
    next = record.user
  })
  return next!
}

export const profileHandlers = [
  http.get(apiUrl('/profile'), withConditions(({ request }) => {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    const record = findUser(auth.userId)
    return record ? HttpResponse.json(record.user) : apiError('NOT_FOUND', 'Perfil não encontrado.', 404)
  })),

  http.patch(apiUrl('/profile'), withConditions(async ({ request }) => {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    const parsed = updateProfileSchema.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error)
    const { walletNickname, ...data } = parsed.data

    const others = mockDb.read().users.filter((u) => u.user.id !== auth.userId)
    const fieldErrors: Record<string, string[]> = {}
    if (others.some((u) => u.user.email === data.email)) fieldErrors.email = ['Este e-mail já está em uso por outra conta.']
    if (others.some((u) => u.user.username.toLowerCase() === data.username.toLowerCase())) {
      fieldErrors.username = ['Este nome de usuário já está em uso.']
    }
    if (Object.keys(fieldErrors).length) return apiError('CONFLICT', 'Alguns dados já estão em uso.', 409, { fieldErrors })

    const user = updateUser(auth.userId, data)
    if (walletNickname) {
      // "Apelido da carteira" do formulário de perfil → carteira principal (se existir).
      mockDb.write((db) => {
        const primary = db.wallets.find((w) => w.userId === auth.userId && w.role === 'primary')
        if (primary) primary.nickname = walletNickname
      })
    }
    return HttpResponse.json(user)
  })),

  http.put(apiUrl('/profile/avatar'), withConditions(async ({ request }) => {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    const parsed = avatarRequestSchema.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error)
    return HttpResponse.json(updateUser(auth.userId, { avatarUrl: parsed.data.dataUrl }))
  })),

  http.delete(apiUrl('/profile/avatar'), withConditions(({ request }) => {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    return HttpResponse.json(updateUser(auth.userId, { avatarUrl: null }))
  })),

  http.post(apiUrl('/profile/password'), withConditions(async ({ request }) => {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    const parsed = changePasswordRequestSchema.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error)
    const record = findUser(auth.userId)
    if (!record) return apiError('NOT_FOUND', 'Perfil não encontrado.', 404)
    if ((await hashPassword(parsed.data.currentPassword, record.passwordSalt)) !== record.passwordHash) {
      return apiError('VALIDATION_ERROR', 'Senha atual incorreta.', 422, { fieldErrors: { currentPassword: ['Senha atual incorreta.'] } })
    }
    const passwordSalt = newSalt()
    const passwordHash = await hashPassword(parsed.data.newPassword, passwordSalt)
    mockDb.write((db) => {
      const target = db.users.find((u) => u.user.id === auth.userId)
      if (target) Object.assign(target, { passwordSalt, passwordHash })
    })
    return new HttpResponse(null, { status: 204 })
  })),
]
