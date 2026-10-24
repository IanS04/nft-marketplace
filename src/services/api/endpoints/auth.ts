import { authSessionSchema, sessionInfoSchema, type SessionInfo } from '@/schemas/auth'
import type { AuthSession, LoginInput, RegisterInput } from '@/types'
import { http } from '../http'

export const authApi = {
  async register({ username, email, password }: RegisterInput): Promise<AuthSession> {
    const { data } = await http.post('/auth/register', { username, email, password })
    return authSessionSchema.parse(data)
  },

  async login(input: LoginInput): Promise<AuthSession> {
    const { data } = await http.post('/auth/login', input)
    return authSessionSchema.parse(data)
  },

  async getSession(signal?: AbortSignal): Promise<SessionInfo> {
    const { data } = await http.get('/auth/session', { signal })
    return sessionInfoSchema.parse(data)
  },

  async logout(): Promise<void> {
    await http.post('/auth/logout')
  },
}