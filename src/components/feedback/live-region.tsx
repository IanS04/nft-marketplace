import { useSyncExternalStore } from 'react'
import { announcer } from './announcer'

/** Renderizado UMA vez no shell da aplicação. Mensagens chegam via announce(). */
export function LiveRegion() {
  const current = useSyncExternalStore(announcer.subscribe, announcer.getSnapshot)
  return (
    <div className="sr-only">
      <div role="status" aria-live="polite" aria-atomic="true" data-testid="live-polite">{current.polite}</div>
      <div role="alert" aria-live="assertive" aria-atomic="true">{current.assertive}</div>
    </div>
  )
}
