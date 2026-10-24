import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, Loader2, PlugZap, XCircle } from 'lucide-react'
import { announce } from '@/components/feedback/announcer'
import { Button } from '@/components/ui/button'
import { NETWORK_LABEL } from '@/features/catalog/labels'
import { errorMessage } from '@/lib/form-errors'
import { cn } from '@/lib/cn'
import { walletsApi } from '@/services/api/endpoints/account'
import type { Blockchain, Wallet, WalletConnectionStatus, WalletProvider } from '@/types'
import { PROVIDER_LABEL, shortAddress } from '@/features/account/labels'

export interface ConnectionState {
  status: WalletConnectionStatus
  message?: string
}

interface WalletConnectionProps {
  wallet: Wallet
  provider: WalletProvider
  network: Blockchain
  state: ConnectionState
  onChange: (state: ConnectionState) => void
}

/** Conexão simulada pela API (o mock pode recusar). A compra só é confirmada com a carteira conectada. */
export function WalletConnectionControl({ wallet, provider, network, state, onChange }: WalletConnectionProps) {
  const connect = useMutation({ mutationFn: () => walletsApi.connect(wallet.id, provider, network) })
  const disconnect = useMutation({ mutationFn: () => walletsApi.disconnect(wallet.id) })
  const label = PROVIDER_LABEL[provider]

  const onConnect = async () => {
    onChange({ status: 'connecting' })
    try {
      await connect.mutateAsync()
      onChange({ status: 'connected' })
      announce(`${label} conectada.`)
    } catch (error) {
      onChange({ status: 'rejected', message: errorMessage(error) })
      announce(`Conexão com ${label} recusada.`, 'assertive')
    }
  }

  const onDisconnect = async () => {
    try {
      await disconnect.mutateAsync()
    } finally {
      onChange({ status: 'disconnected' })
      announce(`${label} desconectada.`)
    }
  }

  return (
    <div
      data-testid="wallet-connection"
      className={cn(
        'space-y-2 rounded-lg border p-3 text-body',
        state.status === 'connected' ? 'border-success/60 bg-success/5' : state.status === 'rejected' ? 'border-destructive/60' : 'border-border',
      )}
    >
      <p className="flex items-center gap-2" role="status">
        {state.status === 'connected' && <CheckCircle2 className="size-4 text-success" aria-hidden="true" />}
        {state.status === 'connecting' && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {state.status === 'rejected' && <XCircle className="size-4 text-destructive" aria-hidden="true" />}
        {state.status === 'disconnected' && <PlugZap className="size-4 text-muted-foreground" aria-hidden="true" />}
        {state.status === 'connected' && <>Conectada: {wallet.nickname} · {shortAddress(wallet.address)} ({label} · {NETWORK_LABEL[network]})</>}
        {state.status === 'connecting' && <>Conectando {label}…</>}
        {state.status === 'rejected' && <>{state.message ?? 'A carteira recusou a conexão.'}</>}
        {state.status === 'disconnected' && <>Carteira desconectada.</>}
      </p>
      {state.status === 'connected' ? (
        <Button variant="ghost" size="sm" onClick={() => void onDisconnect()} disabled={disconnect.isPending}>
          Desconectar
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => void onConnect()} disabled={state.status === 'connecting'}>
          {state.status === 'rejected' ? 'Tentar conectar novamente' : `Conectar ${label}`}
        </Button>
      )}
    </div>
  )
}

/** Mobile (Figma): cartões das carteiras cadastradas ("Principal", "Reserva"). */
export function WalletPicker({ wallets, value, onChange }: { wallets: Wallet[]; value: string; onChange: (id: string) => void }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 text-title">Carteira conectada</legend>
      {wallets.map((wallet) => (
        <label
          key={wallet.id}
          className={cn(
            'relative flex cursor-pointer items-start gap-3 rounded-xl bg-card p-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
            value === wallet.id && 'ring-1 ring-primary/60',
          )}
        >
          <input
            type="radio"
            name="checkout-wallet"
            value={wallet.id}
            checked={value === wallet.id}
            onChange={() => onChange(wallet.id)}
            className="mt-1 size-4 accent-[hsl(var(--primary))]"
          />
          <span className="space-y-0.5">
            <span className="block font-bold">{wallet.nickname}</span>
            <span className="block text-muted-foreground">{wallet.ensName ?? shortAddress(wallet.address)}</span>
            <span className="block text-micro text-muted-foreground">Rede {NETWORK_LABEL[wallet.network]}</span>
          </span>
        </label>
      ))}
    </fieldset>
  )
}
