const PREFIX = 'kurio:idempotency:'

interface StoredAttempt {
  fingerprint: string
  key: string
  createdAt: string
}

/** JSON com chaves ordenadas: o mesmo conteúdo sempre gera a mesma impressão digital. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function read(scope: string): StoredAttempt | null {
  try {
    const raw = localStorage.getItem(PREFIX + scope)
    return raw ? (JSON.parse(raw) as StoredAttempt) : null
  } catch {
    return null
  }
}

/**
 * Mesma tentativa (mesmo conteúdo) → mesma chave, inclusive após refresh ou timeout.
 * Conteúdo diferente → chave nova. Use um escopo por usuário (ex.: `order:${userId}`).
 */
export function getIdempotencyKey(scope: string, payload: unknown): string {
  const fingerprint = stableStringify(payload)
  const stored = read(scope)
  if (stored?.fingerprint === fingerprint) return stored.key

  const attempt: StoredAttempt = { fingerprint, key: crypto.randomUUID(), createdAt: new Date().toISOString() }
  try { localStorage.setItem(PREFIX + scope, JSON.stringify(attempt)) } catch { /* segue só em memória */ }
  return attempt.key
}

/** Chamar SÓ quando o pedido chega a estado terminal (confirmed/rejected). Nunca no logout. */
export function clearIdempotencyKey(scope: string): void {
  try { localStorage.removeItem(PREFIX + scope) } catch { /* ignora */ }
}
