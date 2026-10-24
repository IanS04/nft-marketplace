import { zodResolver } from '@hookform/resolvers/zod'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from '@/lib/toast'
import { z } from 'zod'
import { ErrorState } from '@/components/feedback/error-state'
import { Button } from '@/components/ui/button'
import { EnsField, FieldError, SelectField, TextField } from '@/components/ui/form-field'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth/hooks/use-session'
import { applyApiErrors } from '@/lib/form-errors'
import { walletInputSchema } from '@/schemas/wallet'
import type { Wallet, WalletRole } from '@/types'
import { useSaveWallet, useWallets } from '../hooks/use-account'
import { ensLabelOf, NETWORK_OPTIONS, PROVIDER_OPTIONS } from '../labels'

const formSchema = walletInputSchema.omit({ role: true, ensName: true }).extend({
  ensLabel: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,}(\.[a-z0-9-]+)*$/, 'Informe o nome ENS (sem ".eth").'),
})
type FormInput = z.input<typeof formSchema>

const ROLE_LABEL: Record<WalletRole, string> = { primary: 'principal', secondary: 'secundária' }

export function WalletsPage() {
  const wallets = useWallets()
  if (wallets.isPending) {
    return (
      <div aria-busy="true" aria-label="Carregando carteiras" className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-5 md:grid-cols-2">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
      </div>
    )
  }
  if (wallets.isError) {
    return <ErrorState title="Não foi possível carregar suas carteiras" error={wallets.error} onRetry={() => void wallets.refetch()} />
  }
  const primary = wallets.data.find((w) => w.role === 'primary')
  const secondary = wallets.data.find((w) => w.role === 'secondary')

  return (
    // h1 fora do space-y: um primeiro filho invisível ainda empurraria a seção seguinte.
    <>
      <h1 className="sr-only">Carteiras</h1>
      <div className="space-y-12">
        <WalletSection role="primary" wallet={primary} />
        <WalletSection role="secondary" wallet={secondary} primary={primary} />
      </div>
    </>
  )
}

function WalletSection({ role, wallet, primary }: { role: WalletRole; wallet?: Wallet; primary?: Wallet }) {
  const titleId = useId()
  const { session } = useSession()
  // A principal aparece sempre como formulário (Figma); a secundária só depois de "Adicionar".
  const [adding, setAdding] = useState(role === 'primary')
  const [sameAsPrimary, setSameAsPrimary] = useState(false)
  const showForm = !!wallet || adding

  const user = session?.user
  const base = sameAsPrimary && primary ? primary : null
  const defaults: Partial<FormInput> = wallet
    ? { ...wallet, ensLabel: ensLabelOf(wallet.ensName), secondaryReference: wallet.secondaryReference ?? '' }
    : base
      ? { ...base, nickname: 'Reserva', ensLabel: ensLabelOf(base.ensName), secondaryReference: base.secondaryReference ?? '' }
      : { displayName: user?.displayName ?? '', email: user?.email ?? '', ensLabel: ensLabelOf(user?.ensName), secondaryReference: '' }

  return (
    <section aria-labelledby={titleId} className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={titleId} className="text-title">Carteira {ROLE_LABEL[role]}</h2>
          {role === 'primary' && (
            <p className="text-micro text-primary">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
          )}
          {!showForm && <p className="text-micro text-primary">Você ainda não adicionou uma carteira secundária.</p>}
        </div>
        {!wallet && role === 'secondary' && (
          <div className="flex items-center gap-4">
            {primary && (
              <label className="flex items-center gap-2 text-body">
                <input
                  type="checkbox"
                  checked={sameAsPrimary}
                  onChange={(e) => setSameAsPrimary(e.target.checked)}
                  className="size-4 accent-[hsl(var(--primary))]"
                />
                Igual à carteira principal
              </label>
            )}
            {!adding && <Button variant="link" className="h-auto px-0 font-bold" onClick={() => setAdding(true)}>Adicionar</Button>}
          </div>
        )}
      </header>

      {showForm && (
        <WalletForm
          key={`${wallet?.updatedAt ?? 'new'}-${sameAsPrimary}`}
          role={role}
          wallet={wallet}
          defaults={defaults}
          onCancel={!wallet && role === 'secondary' ? () => setAdding(false) : undefined}
        />
      )}
    </section>
  )
}

interface WalletFormProps {
  role: WalletRole
  wallet?: Wallet
  defaults: Partial<FormInput>
  onCancel?: () => void
}

function WalletForm({ role, wallet, defaults, onCancel }: WalletFormProps) {
  const save = useSaveWallet()
  const form = useForm<FormInput, unknown, z.output<typeof formSchema>>({ resolver: zodResolver(formSchema), defaultValues: defaults })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async ({ ensLabel, ...values }) => {
    try {
      await save.mutateAsync({ id: wallet?.id, input: { ...values, role, ensName: `${ensLabel}.eth` } })
      toast.success(wallet ? 'Carteira atualizada.' : `Carteira ${ROLE_LABEL[role]} adicionada.`)
    } catch (error) {
      applyApiErrors(error, form.setError, ['displayName', 'nickname', 'network', 'address', 'secondaryReference', 'provider', 'profileName', 'referralCode', 'email'])
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5" aria-label={`Carteira ${ROLE_LABEL[role]}`}>
      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
        <TextField label="Nome de exibição" required error={errors.displayName?.message} {...form.register('displayName')} />
        <TextField label="Apelido da carteira" required error={errors.nickname?.message} {...form.register('nickname')} />
        <SelectField label="Rede" required placeholder="Selecione uma rede" options={NETWORK_OPTIONS} error={errors.network?.message} {...form.register('network')} />
        <TextField label="Nome do perfil" required error={errors.profileName?.message} {...form.register('profileName')} />
        <TextField label="Endereço da carteira" required placeholder="Endereço 0x da carteira" autoComplete="off" spellCheck={false} error={errors.address?.message} {...form.register('address')} />
        <TextField label="ENS ou carteira secundária (opcional)" placeholder="ENS ou carteira secundária (opcional)" error={errors.secondaryReference?.message} {...form.register('secondaryReference')} />
        <SelectField label="Tipo de carteira" required placeholder="Selecione uma carteira" options={PROVIDER_OPTIONS} error={errors.provider?.message} {...form.register('provider')} />
        <TextField label="Código de indicação" required error={errors.referralCode?.message} {...form.register('referralCode')} />
        <TextField label="E-mail" required type="email" error={errors.email?.message} {...form.register('email')} />
        <EnsField error={errors.ensLabel?.message} {...form.register('ensLabel')} />
      </div>
      {errors.root?.server?.message && <div role="alert"><FieldError>{errors.root.server.message}</FieldError></div>}
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando…' : 'Salvar carteira'}</Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>}
      </div>
    </form>
  )
}
