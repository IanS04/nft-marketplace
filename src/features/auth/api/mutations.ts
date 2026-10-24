import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { queryKeys } from '@/app/query-keys'
import { authApi } from '@/services/api/endpoints/auth'
import { sessionStore } from '@/services/api/session-store'
import type { AuthSession, LoginInput, RegisterInput } from '@/types'

/*
 * Nos formulários, use `mutateAsync` (e não callbacks do `mutate`): ao trocar de usuário o
 * session-sync limpa o cache de mutations, e callbacks registrados no `mutate` deixariam de rodar.
 */

function useAuthMutation<TInput>(request: (input: TInput) => Promise<AuthSession>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: request,
    onSuccess: (session) => {
      // Troca de usuário → session-sync descarta o cache do anterior.
      sessionStore.signIn(session)
      // Mesmo usuário voltando de uma expiração → refaz o que falhou com o token antigo.
      void queryClient.invalidateQueries({ queryKey: queryKeys.user(session.user.id).root })
    },
  })
}

export const useLogin = () => useAuthMutation((input: LoginInput) => authApi.login(input))
export const useRegister = () => useAuthMutation((input: RegisterInput) => authApi.register(input))

/**
 * Logout é uma ação simples (não useMutation): a sessão local é encerrada mesmo se a chamada
 * falhar (sem rede), e o próprio signOut limpa o cache de mutations.
 */
export function useLogout() {
  const [isPending, setPending] = useState(false)
  const logout = useCallback(async () => {
    setPending(true)
    try {
      await authApi.logout()
    } catch {
      /* sem rede: o token expira sozinho no servidor; aqui saímos de qualquer forma */
    } finally {
      sessionStore.signOut()
      setPending(false)
    }
  }, [])
  return { logout, isPending }
}
