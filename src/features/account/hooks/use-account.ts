import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { profileApi, walletsApi } from '@/services/api/endpoints/account'
import { sessionStore } from '@/services/api/session-store'
import type { ChangePasswordInput, UpdateProfileInput, User, Wallet, WalletId, WalletInput } from '@/types'
import { NO_USER_KEY, useUserScope } from './use-user-scope'

export function useWallets() {
  const { keys, enabled } = useUserScope()
  return useQuery({
    queryKey: keys?.wallets ?? NO_USER_KEY,
    queryFn: ({ signal }) => walletsApi.list(signal),
    enabled,
  })
}

/** Cria (sem id) ou atualiza (com id) e atualiza a lista em cache com a resposta da API. */
export function useSaveWallet() {
  const queryClient = useQueryClient()
  const { keys } = useUserScope()
  return useMutation({
    mutationFn: ({ id, input }: { id?: WalletId; input: WalletInput }) =>
      id ? walletsApi.update(id, input) : walletsApi.create(input),
    onSuccess: (wallet) => {
      if (!keys) return
      queryClient.setQueryData<Wallet[]>(keys.wallets, (list = []) =>
        list.some((w) => w.id === wallet.id) ? list.map((w) => (w.id === wallet.id ? wallet : w)) : [...list, wallet],
      )
    },
  })
}

export function useProfile() {
  const { user, keys, enabled } = useUserScope()
  return useQuery({
    queryKey: keys?.profile ?? NO_USER_KEY,
    queryFn: ({ signal }) => profileApi.get(signal),
    enabled,
    // Enquanto busca, mostra o usuário da sessão (sem tela vazia).
    placeholderData: user ?? undefined,
  })
}

/** Resposta da API = novo usuário: atualiza o cache e a sessão (o header muda na hora). */
function useApplyUser() {
  const queryClient = useQueryClient()
  const { keys } = useUserScope()
  return (user: User) => {
    if (keys) queryClient.setQueryData(keys.profile, user)
    sessionStore.updateUser(user)
  }
}

export function useUpdateProfile() {
  const applyUser = useApplyUser()
  const queryClient = useQueryClient()
  const { keys } = useUserScope()
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => profileApi.update(input),
    onSuccess: (user) => {
      applyUser(user)
      // O apelido da carteira principal pode ter mudado junto.
      if (keys) void queryClient.invalidateQueries({ queryKey: keys.wallets })
    },
  })
}

export function useAvatar() {
  const applyUser = useApplyUser()
  const set = useMutation({ mutationFn: (dataUrl: string) => profileApi.setAvatar(dataUrl), onSuccess: applyUser })
  const remove = useMutation({ mutationFn: () => profileApi.removeAvatar(), onSuccess: applyUser })
  return { set, remove }
}

export function useChangePassword() {
  return useMutation({ mutationFn: (input: ChangePasswordInput) => profileApi.changePassword(input) })
}
