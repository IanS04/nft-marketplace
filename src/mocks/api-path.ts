import { env } from '@/app/env'

const base = env.VITE_API_URL.replace(/\/+$/, '')

/** URL que o MSW intercepta para um caminho da API: apiUrl('/nfts') → '/api/nfts'. */
export const apiUrl = (path: string): string => `${base}${path}`

/** '/api/nfts/emerald-ape-042' → '/nfts/emerald-ape-042' (usado pelas regras de falha dos cenários). */
export function relativeApiPath(pathname: string): string {
  const prefix = new URL(base || '/', window.location.origin).pathname.replace(/\/+$/, '')
  return pathname.startsWith(prefix) ? pathname.slice(prefix.length) || '/' : pathname
}
