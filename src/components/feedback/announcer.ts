type Politeness = 'polite' | 'assertive'

let messages: Record<Politeness, string> = { polite: '', assertive: '' }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/**
 * Anuncia uma mensagem para leitores de tela (resultados da busca, mutations, eventos em tempo real).
 * Limpa antes de escrever para que a mesma frase repetida seja lida de novo.
 */
export function announce(message: string, politeness: Politeness = 'polite'): void {
  messages = { ...messages, [politeness]: '' }
  emit()
  setTimeout(() => {
    messages = { ...messages, [politeness]: message }
    emit()
  }, 50)
}

export const announcer = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  },
  getSnapshot: () => messages,
}
