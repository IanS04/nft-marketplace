import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import { env } from '@/app/env'
import { mockDb } from '../db/db'
import { realtimeHub, type Peer } from './hub'

/*
 * Socket.IO simulado com @mswjs/socket.io-binding.
 * Transporte: só WebSocket (o MSW intercepta WebSocket; long-polling HTTP não é simulado) —
 * por isso o cliente usa `transports: ['websocket']`.
 * O binding faz o handshake (pacotes "0" e "40"), mas não o heartbeat: enviamos o ping ("2")
 * para o socket.io-client não derrubar a conexão a cada ~30s. Sem rooms, broadcast nem ack.
 */

const origin = (env.VITE_SOCKET_URL ?? window.location.origin).replace(/^http/, 'ws').replace(/\/+$/, '')
// O MSW remove o prefixo "/socket.io/" do caminho antes de comparar: o link é a ORIGEM do servidor.
const socketServer = ws.link(`${origin}/`)

const PING_INTERVAL_MS = 20_000

/** Pacote CONNECT do Socket.IO: "40" + JSON com o `auth` do cliente. */
function userFromConnectPacket(data: unknown): Peer['userId'] | undefined {
  if (typeof data !== 'string' || !data.startsWith('40')) return undefined
  try {
    const auth = JSON.parse(data.slice(2) || '{}') as { token?: unknown }
    if (typeof auth.token !== 'string') return null
    const session = mockDb.read().sessions.find((s) => s.token === auth.token)
    return session && !session.expired && session.expiresAt > Date.now() ? session.userId : null
  } catch {
    return null
  }
}

export const realtimeHandlers = [
  socketServer.addEventListener('connection', (connection) => {
    // Mesma origem, mas não é Socket.IO (ex.: HMR do Vite): segue para o servidor real.
    if (!connection.client.url.searchParams.has('EIO')) {
      connection.server.connect()
      return
    }
    // "Servidor fora do ar": recusa (o cliente tenta reconectar com backoff).
    if (!realtimeHub.isOnline()) {
      connection.client.close(4000, 'offline')
      return
    }

    const io = toSocketIo(connection)
    const peer: Peer = {
      userId: null,
      emit: (event, payload) => io.client.emit(event, payload),
      close: () => connection.client.close(4001, 'server-closed'),
    }

    connection.client.addEventListener('message', (event) => {
      const userId = userFromConnectPacket(event.data)
      if (userId !== undefined) peer.userId = userId
    })

    const ping = setInterval(() => connection.client.send('2'), PING_INTERVAL_MS)
    connection.client.addEventListener('close', () => {
      clearInterval(ping)
      realtimeHub.remove(peer)
    })
    realtimeHub.add(peer)
  }),
]
