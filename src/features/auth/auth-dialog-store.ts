import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useCallback, useSyncExternalStore } from 'react'

export type AuthMode = 'login' | 'register'

interface AuthDialogState {
  open: boolean
  mode: AuthMode
}

let state: AuthDialogState = { open: false, mode: 'login' }
const listeners = new Set<() => void>()
const commit = (next: AuthDialogState) => {
  state = next
  listeners.forEach((l) => l())
}

/** Modal de login/cadastro do desktop. Qualquer componente pode abrir (ex.: favoritar sem sessão). */
export const authDialog = {
  open: (mode: AuthMode = 'login') => commit({ open: true, mode }),
  close: () => commit({ ...state, open: false }),
  setMode: (mode: AuthMode) => commit({ ...state, mode }),
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  },
  getSnapshot: () => state,
}

export const useAuthDialog = () => useSyncExternalStore(authDialog.subscribe, authDialog.getSnapshot)

const DESKTOP_QUERY = '(min-width: 768px)'
const AUTH_PATHS = ['/login', '/register']

/**
 * Desktop: abre o modal por cima da página atual (como no Figma).
 * Mobile: vai para a página cheia de login, guardando a página atual em `?redirect=`.
 */
export function useOpenAuth() {
  const navigate = useNavigate()
  const location = useRouterState({ select: (s) => s.location })

  return useCallback(
    (mode: AuthMode = 'login') => {
      if (window.matchMedia(DESKTOP_QUERY).matches) {
        authDialog.open(mode)
        return
      }
      const redirect = AUTH_PATHS.includes(location.pathname) ? undefined : location.href
      void navigate({ to: mode === 'login' ? '/login' : '/register', search: { redirect } })
    },
    [navigate, location],
  )
}
