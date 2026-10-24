import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { queryKeys } from '@/app/query-keys'
import { announce } from '@/components/feedback/announcer'
import { useSession } from '@/features/auth/hooks/use-session'
import { errorMessage } from '@/lib/form-errors'
import { favoritesApi } from '@/services/api/endpoints/favorites'
import type { NftId, UserId } from '@/types'

/** Sem sessão a query fica desligada; a chave neutra só evita um id "falso" de usuário. */
const favoritesKey = (userId: UserId | undefined) =>
  userId ? queryKeys.user(userId).favorites : (['favorites', 'anonymous'] as const)

/** Favoritos do usuário logado (vazio para visitante). Persistem no servidor simulado. */
export function useFavorites() {
  const { status, session } = useSession()
  const userId = session?.user.id
  const query = useQuery({
    queryKey: favoritesKey(userId),
    queryFn: ({ signal }) => favoritesApi.list(signal),
    enabled: status === 'authenticated' && !!userId,
  })
  const ids = useMemo(() => new Set<NftId>(query.data?.nftIds ?? []), [query.data])
  return { ids, isLoading: query.isLoading }
}

interface ToggleVars { nftId: NftId; name: string; favorite: boolean }

/**
 * Atualização OTIMISTA com rollback:
 * 1. onMutate: cancela leituras em andamento, guarda o estado anterior e aplica a mudança na hora;
 * 2. onError: devolve o estado anterior e avisa o usuário;
 * 3. onSettled: sincroniza com o servidor (fonte da verdade).
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const { session } = useSession()
  const key = favoritesKey(session?.user.id)

  return useMutation({
    mutationFn: ({ nftId, favorite }: ToggleVars) => (favorite ? favoritesApi.add(nftId) : favoritesApi.remove(nftId)),
    onMutate: async ({ nftId, favorite }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<{ nftIds: NftId[] }>(key)
      const current = previous?.nftIds ?? []
      queryClient.setQueryData(key, {
        nftIds: favorite ? [...new Set([...current, nftId])] : current.filter((id) => id !== nftId),
      })
      return { previous }
    },
    onError: (error, { name, favorite }, context) => {
      queryClient.setQueryData(key, context?.previous)
      toast.error(favorite ? `Não foi possível favoritar ${name}.` : `Não foi possível remover ${name} dos favoritos.`, {
        description: `${errorMessage(error)} Nada foi alterado.`,
      })
    },
    onSuccess: (_data, { name, favorite }) => {
      announce(favorite ? `${name} adicionado aos favoritos.` : `${name} removido dos favoritos.`)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
