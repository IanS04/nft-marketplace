import type { ManagerOptions, Socket, SocketOptions } from 'socket.io-client'
import { env } from '@/app/env'
import type { ClientToServerEvents, ServerToClientEvents } from '@/types'

export type KurioSocket = Socket<ServerToClientEvents, ClientToServerEvents>

/**
 * Um socket por sessão: o token vai no `auth` do pacote CONNECT (o servidor decide quem recebe
 * eventos privados). Só WebSocket: é o transporte que o MSW consegue interceptar.
 *
 * Import DINÂMICO de propósito: o engine.io-client guarda a referência a `WebSocket` quando o
 * módulo é avaliado. Carregando depois de `enableMocking()`, ele pega o WebSocket já interceptado
 * pelo MSW. (Bônus: a biblioteca sai do bundle inicial.)
 */
export async function createSocket(token: string | null): Promise<KurioSocket> {
  const { io } = await import('socket.io-client')
  const options: Partial<ManagerOptions & SocketOptions> = {
    transports: ['websocket'],
    auth: token ? { token } : {},
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3_000,
    timeout: 5_000,
  }
  return env.VITE_SOCKET_URL ? io(env.VITE_SOCKET_URL, options) : io(options)
}
