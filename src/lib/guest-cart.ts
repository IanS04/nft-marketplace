const KEY = 'kurio:guest-cart-id'
let memoryId: string | null = null

/** Identificador do carrinho do visitante (persistido: o carrinho sobrevive ao refresh). */
export function getGuestCartId(): string {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored) return stored
    const id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
    return id
  } catch {
    memoryId ??= crypto.randomUUID() // storage bloqueado: vale só nesta aba
    return memoryId
  }
}

/** Depois do merge no login o carrinho do visitante deixa de existir: o próximo será novo. */
export function resetGuestCartId(): void {
  memoryId = null
  try { localStorage.removeItem(KEY) } catch { /* ignora */ }
}

export const hasGuestCartId = (): boolean => {
  try { return localStorage.getItem(KEY) !== null } catch { return memoryId !== null }
}
