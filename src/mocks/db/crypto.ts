// Mock: SHA-256 com salt. Nunca guarda senha em claro, mas NÃO é um KDF real (sem custo/work factor).
export async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const newSalt = () => crypto.randomUUID()
export const newToken = () => `mock.${crypto.randomUUID()}`