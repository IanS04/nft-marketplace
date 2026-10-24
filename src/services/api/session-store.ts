import { authSessionSchema } from '@/schemas/auth'
import type { AuthSession } from '@/types'

const STORAGE_KEY = 'kurio:session'

export type SessionStatus = 'anonymous' | 'authenticated' | 'expired'

export interface SessionState {
  readonly status: SessionStatus
  /** Mantida em "expired" para retomar o contexto (checkout) ao entrar de novo. */
  readonly session: AuthSession | null
}

const ANONYMOUS: SessionState = { status: 'anonymous', session: null }
const listeners = new Set<() => void>()
let expiryTimer: ReturnType<typeof setTimeout> | undefined

function read(): SessionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return ANONYMOUS
    const stored = JSON.parse(raw) as { session?: unknown; expired?: boolean }
    const parsed = authSessionSchema.safeParse(stored.session)
    if (!parsed.success) return ANONYMOUS
    const expired = stored.expired === true || Date.parse(parsed.data.expiresAt) <= Date.now()
    return { status: expired ? 'expired' : 'authenticated', session: parsed.data }
  } catch {
    return ANONYMOUS
  }
}

let state: SessionState = read()

function persist() {
  try {
    if (state.session) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ session: state.session, expired: state.status === 'expired' }),
      )
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch { /* storage indisponível */ }
}

function scheduleExpiry() {
  clearTimeout(expiryTimer)
  if (state.status !== 'authenticated' || !state.session) return
  const ms = Math.min(Date.parse(state.session.expiresAt) - Date.now(), 2_147_000_000)
  expiryTimer = setTimeout(() => sessionStore.markExpired(), Math.max(ms, 0))
}

function commit(next: SessionState, { persistChange = true } = {}) {
  state = next
  if (persistChange) persist()
  scheduleExpiry()
  listeners.forEach((listener) => listener())
}

export const sessionStore = {
  getSnapshot: (): SessionState => state,

  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  },

  getAccessToken: (): string | null =>
    state.status === 'authenticated' ? (state.session?.accessToken ?? null) : null,

  signIn: (session: AuthSession) => commit({ status: 'authenticated', session }),
  signOut: () => commit(ANONYMOUS),

  /** Perfil editado: atualiza o usuário guardado (header, prefill do checkout) sem trocar o token. */
  updateUser(user: AuthSession['user']) {
    if (!state.session || state.session.user.id !== user.id) return
    commit({ ...state, session: { ...state.session, user } })
  },

  /** `sentToken` evita que um 401 tardio de uma sessão antiga expire a sessão nova. */
  markExpired(sentToken?: string | null) {
    if (state.status !== 'authenticated' || !state.session) return
    if (sentToken && sentToken !== state.session.accessToken) return
    commit({ status: 'expired', session: state.session })
  },
}

// Sincroniza abas (logout/login em outra aba).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY || event.key === null) commit(read(), { persistChange: false })
  })
  scheduleExpiry()
}
