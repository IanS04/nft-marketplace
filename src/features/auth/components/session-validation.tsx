import { useQuery } from '@tanstack/react-query'
import type { UserId } from '@/types'
import { sessionQueryOptions } from '../api/queries'
import { useSession } from '../hooks/use-session'

/**
 * Sessão recuperada do localStorage após refresh: confirma com o servidor (e de novo ao voltar o
 * foco da janela). Se o token não vale mais, o interceptor marca a sessão como expirada.
 */
export function SessionValidation() {
  const { status, session } = useSession()
  if (status !== 'authenticated' || !session) return null
  return <ValidateSession key={session.user.id} userId={session.user.id} />
}

function ValidateSession({ userId }: { userId: UserId }) {
  useQuery(sessionQueryOptions(userId))
  return null
}
