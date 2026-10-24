import type { WalletProvider } from '@/types'
import { NETWORK_LABEL } from '@/features/catalog/labels'

export const PROVIDER_LABEL: Record<WalletProvider, string> = {
  walletconnect: 'WalletConnect',
  metamask: 'MetaMask',
  coinbase: 'Coinbase Wallet',
}

export const NETWORK_OPTIONS = Object.entries(NETWORK_LABEL).map(([value, label]) => ({ value, label }))
export const PROVIDER_OPTIONS = Object.entries(PROVIDER_LABEL).map(([value, label]) => ({ value, label }))

/** "0xA91F3c…E82C" → "0xA91F…E82C" (como no Figma). */
export const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`

/** "ana.kurio.eth" → "ana.kurio" (o ".eth" fica no seletor do campo). */
export const ensLabelOf = (ens: string | null | undefined) => (ens ? ens.replace(/\.eth$/, '') : '')
