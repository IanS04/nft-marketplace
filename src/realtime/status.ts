import { useSyncExternalStore } from 'react'

/** idle = sem socket · connecting = 1ª conexão · connected · reconnecting = caiu e está tentando voltar. */
export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting'

let status: RealtimeStatus = 'idle'
const listeners = new Set<() => void>()

export const realtimeStatus = {
  get: () => status,
  set(next: RealtimeStatus) {
    if (next === status) return
    status = next
    listeners.forEach((l) => l())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  },
}

export const useRealtimeStatus = () => useSyncExternalStore(realtimeStatus.subscribe, realtimeStatus.get)
