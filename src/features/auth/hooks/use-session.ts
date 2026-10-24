import { useSyncExternalStore } from 'react'
import { sessionStore, type SessionState } from '@/services/api/session-store'

/** Estado da sessão (anonymous | authenticated | expired), reativo e sincronizado entre abas. */
export function useSession(): SessionState {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot)
}
