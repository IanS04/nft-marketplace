import { queryKeys } from '@/app/query-keys'
import { useSession } from '@/features/auth/hooks/use-session'
import type { User } from '@/types'

/** Usuário da sessão + chaves privadas. `enabled` só com sessão válida (expirada mantém o cache). */
export function useUserScope(): { user: User | null; keys: ReturnType<typeof queryKeys.user> | null; enabled: boolean } {
  const { status, session } = useSession()
  const user = session?.user ?? null
  return { user, keys: user ? queryKeys.user(user.id) : null, enabled: status === 'authenticated' && !!user }
}

/** Chave neutra para quando não há usuário (a query fica desligada e nunca busca). */
export const NO_USER_KEY = ['user', '__none__'] as const
