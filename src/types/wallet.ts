import type { Blockchain, ISODateString, UserId, WalletId } from './common'

export type WalletProvider = 'walletconnect' | 'metamask' | 'coinbase'
export type WalletRole = 'primary' | 'secondary'

export interface Wallet {
  id: WalletId
  userId: UserId
  role: WalletRole
  displayName: string
  nickname: string                  // "Principal", "Reserva"
  network: Blockchain
  address: string                   // 0x…
  ensName: string | null            // "nova.kurio.eth"
  secondaryReference: string | null // "ENS ou carteira secundária (opcional)"
  provider: WalletProvider
  profileName: string
  referralCode: string
  email: string
  updatedAt: ISODateString
}

export type WalletInput = Omit<Wallet, 'id' | 'userId' | 'updatedAt'>

/** Conexão simulada (conectar / recusar / desconectar) */
export type WalletConnectionStatus =
  | 'disconnected' | 'connecting' | 'connected' | 'rejected'

export interface WalletConnection {
  walletId: WalletId | null
  provider: WalletProvider
  network: Blockchain
  status: WalletConnectionStatus
  connectedAt: ISODateString | null
}