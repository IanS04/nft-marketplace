import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { ChevronLeft, Clock } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { Container } from '@/components/layout/container'
import { NftImage } from '@/components/nft/nft-image'
import { Button } from '@/components/ui/button'
import { EnsField, FieldError, SelectField, TextAreaField, TextField } from '@/components/ui/form-field'
import { Skeleton } from '@/components/ui/skeleton'
import { useWallets } from '@/features/account/hooks/use-account'
import { useUserScope } from '@/features/account/hooks/use-user-scope'
import { ensLabelOf, NETWORK_OPTIONS, PROVIDER_LABEL, PROVIDER_OPTIONS, shortAddress } from '@/features/account/labels'
import { useCart, useQuote } from '@/features/cart/hooks/use-cart'
import { cn } from '@/lib/cn'
import { useMediaQuery } from '@/lib/use-media-query'
import { formatEth, formatEthWithUnit } from '@/lib/money'
import { BLOCKCHAINS } from '@/schemas/common'
import { collectorDetailsSchema } from '@/schemas/order'
import { WALLET_PROVIDERS } from '@/schemas/wallet'
import type { Cart, User, Wallet } from '@/types'
import { usePendingOrders } from '../hooks/use-orders'
import { OrderReviewDialog } from './order-review-dialog'
import { WalletConnectionControl, WalletPicker, type ConnectionState } from './wallet-connection'

const formSchema = collectorDetailsSchema.omit({ ensName: true }).extend({
  ensLabel: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,}(\.[a-z0-9-]+)*$/, 'Informe o nome ENS (sem ".eth").'),
  network: z.enum(BLOCKCHAINS, { errorMap: () => ({ message: 'Selecione uma rede.' }) }),
  provider: z.enum(WALLET_PROVIDERS, { errorMap: () => ({ message: 'Selecione uma carteira.' }) }),
})
type FormValues = z.infer<typeof formSchema>

export function CheckoutPage() {
  const cart = useCart()
  const wallets = useWallets()
  const pending = usePendingOrders()
  const { user } = useUserScope()

  return (
    <Container className="space-y-6 py-4 md:py-8">
      <CheckoutHeader />
      {cart.isPending || wallets.isPending || !user ? (
        <CheckoutSkeleton />
      ) : !cart.data || !wallets.data ? (
        // Só sem dados: um erro em segundo plano (ex.: 401 da sessão expirada ao revisar) não pode
        // desmontar o formulário e apagar o que foi digitado — o diálogo de sessão cuida da retomada.
        <ErrorState
          title="Não foi possível carregar o pagamento"
          error={cart.error ?? wallets.error}
          onRetry={() => { void cart.refetch(); void wallets.refetch() }}
        />
      ) : cart.data.items.length === 0 ? (
        <EmptyState
          title="Seu carrinho está vazio"
          description="Escolha NFTs no mercado para finalizar uma compra."
          action={<Button asChild><Link to="/" hash="catalogo">Explorar NFTs</Link></Button>}
        />
      ) : wallets.data.length === 0 ? (
        <EmptyState
          title="Cadastre uma carteira para pagar"
          description="O pagamento usa as suas carteiras cadastradas. Leva menos de um minuto."
          action={<Button asChild><Link to="/profile/wallets">Cadastrar carteira</Link></Button>}
        />
      ) : (
        <CheckoutForm
          key={user.id}
          cart={cart.data}
          wallets={wallets.data}
          user={user}
          pendingOrderId={pending.data?.[0]?.id}
        />
      )}
    </Container>
  )
}

function CheckoutHeader() {
  const router = useRouter()
  const navigate = useNavigate()
  const canGoBack = useCanGoBack()
  return (
    <>
      <Breadcrumb
        className="hidden md:block"
        items={[
          { label: 'Início', link: { to: '/' } },
          { label: 'Mercado', link: { to: '/', hash: 'catalogo' } },
          { label: 'Pagamento' },
        ]}
      />
      <div className="relative flex items-center justify-center md:hidden">
        <button
          type="button"
          onClick={() => (canGoBack ? router.history.back() : void navigate({ to: '/cart' }))}
          aria-label="Voltar"
          className="absolute left-0 flex size-10 items-center justify-center rounded-full bg-card text-primary"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <h1 className="text-title">Pagamento com carteira</h1>
      </div>
      <h1 className="hidden md:block md:sr-only">Pagamento</h1>
    </>
  )
}

interface CheckoutFormProps {
  cart: Cart
  wallets: Wallet[]
  user: User
  pendingOrderId?: string
}

function CheckoutForm({ cart, wallets, user, pendingOrderId }: CheckoutFormProps) {
  const primary = wallets.find((w) => w.role === 'primary') ?? wallets[0]!
  const secondary = wallets.find((w) => w.id !== primary.id)
  const [walletId, setWalletId] = useState(primary.id)
  const wallet = wallets.find((w) => w.id === walletId) ?? primary
  const [connection, setConnection] = useState<ConnectionState>({ status: 'disconnected' })
  const [reviewOpen, setReviewOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  // Pré-preenchido com o perfil + carteira principal: o colecionador só revisa.
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: user.displayName,
      username: user.username,
      email: user.email,
      profileName: wallet.profileName,
      referralCode: wallet.referralCode,
      ensLabel: ensLabelOf(wallet.ensName ?? user.ensName),
      note: '',
      network: wallet.network,
      provider: wallet.provider,
    },
  })
  const { errors } = form.formState
  const network = form.watch('network')
  const provider = form.watch('provider')
  const quote = useQuote(cart, network)

  // Trocar carteira, tipo ou rede exige conectar de novo.
  const resetConnection = () => setConnection({ status: 'disconnected' })
  const selectWallet = (id: string) => {
    const next = wallets.find((w) => w.id === id)
    if (!next) return
    setWalletId(next.id)
    form.setValue('network', next.network)
    form.setValue('provider', next.provider)
    resetConnection()
  }

  const onConfirm = form.handleSubmit(
    () => {
      if (connection.status !== 'connected') {
        form.setError('root.server', { message: `Conecte a carteira (${PROVIDER_LABEL[provider]}) para confirmar a compra.` })
        return
      }
      setReviewOpen(true)
    },
    () => setDetailsOpen(true), // erros nos dados: abre a seção (mobile) para o usuário ver
  )

  const values = form.getValues()
  const blocking = quote.data?.issues.some((i) => i.severity === 'blocking')

  return (
    <form onSubmit={onConfirm} noValidate className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12">
      {/* Coluna esquerda: "Perfil do colecionador" */}
      <div className="space-y-6">
        {pendingOrderId && (
          <p role="status" className="flex flex-wrap items-center gap-2 rounded-sm border border-warning/60 bg-warning/10 p-3 text-body">
            <Clock className="size-4 text-warning" aria-hidden="true" />
            Você tem um pedido aguardando confirmação. Aguarde a conclusão antes de uma nova compra.
            <Link to="/orders/$orderId" params={{ orderId: pendingOrderId }} className="font-bold text-primary underline underline-offset-4">
              Acompanhar pedido
            </Link>
          </p>
        )}

        <div className="md:hidden">
          <WalletPicker wallets={wallets} value={walletId} onChange={selectWallet} />
        </div>

        <details
          // Desktop: sempre aberto (Figma). Mobile: recolhido, já pré-preenchido.
          open={isDesktop || detailsOpen}
          onToggle={(e) => { if (!isDesktop) setDetailsOpen(e.currentTarget.open) }}
          className="group rounded-lg bg-card p-4 md:rounded-none md:bg-transparent md:p-0 [&_summary::-webkit-details-marker]:hidden"
        >
          <summary className="cursor-pointer list-none text-title md:hidden">
            Perfil do colecionador <span className="text-micro text-muted-foreground">(pré-preenchido · toque para revisar)</span>
          </summary>
          <h2 className="mb-4 hidden text-title md:block">Perfil do colecionador</h2>
          <div className="mt-4 grid gap-x-6 gap-y-4 md:mt-0 md:grid-cols-2">
            <TextField label="Nome de exibição" required error={errors.displayName?.message} {...form.register('displayName')} />
            <TextField label="Nome de usuário" required error={errors.username?.message} {...form.register('username')} />
            <SelectField
              label="Rede"
              required
              options={NETWORK_OPTIONS}
              error={errors.network?.message}
              {...form.register('network', { onChange: resetConnection })}
            />
            <TextField label="Nome do perfil" required error={errors.profileName?.message} {...form.register('profileName')} />
            <TextField label="Endereço da carteira" required readOnly value={wallet.address} aria-readonly="true" className="[&_input]:text-muted-foreground" />
            <TextField
              label="ENS ou carteira secundária (opcional)"
              readOnly
              value={wallet.secondaryReference ?? wallet.ensName ?? ''}
              placeholder="ENS ou carteira secundária (opcional)"
              className="[&_input]:text-muted-foreground"
            />
            <SelectField
              label="Tipo de carteira"
              required
              options={PROVIDER_OPTIONS}
              error={errors.provider?.message}
              {...form.register('provider', { onChange: resetConnection })}
            />
            <TextField label="Código de indicação" required error={errors.referralCode?.message} {...form.register('referralCode')} />
            <TextField label="E-mail" required type="email" error={errors.email?.message} {...form.register('email')} />
            <EnsField error={errors.ensLabel?.message} {...form.register('ensLabel')} />
          </div>
          {secondary && (
            <label className="mt-4 hidden items-center gap-2 text-body md:flex">
              <input
                type="checkbox"
                checked={walletId === secondary.id}
                onChange={(e) => selectWallet(e.target.checked ? secondary.id : primary.id)}
                className="size-4 accent-[hsl(var(--primary))]"
              />
              Usar outra carteira? <span className="text-muted-foreground">({secondary.nickname} · {secondary.ensName ?? shortAddress(secondary.address)})</span>
            </label>
          )}
          <TextAreaField label="Observação do colecionador (opcional)" className="mt-4 md:max-w-sm" error={errors.note?.message} {...form.register('note')} />
        </details>
      </div>

      {/* Coluna direita: "Seus NFTs", resumo, carteira e rede */}
      <aside aria-label="Resumo do pedido" className="space-y-5 lg:sticky lg:top-24">
        <section aria-labelledby="checkout-items" className="space-y-3">
          <div className="flex justify-between font-bold">
            <h2 id="checkout-items" className="text-title">Seus NFTs</h2>
            <span aria-hidden="true">Subtotal</span>
          </div>
          <ul className="space-y-2">
            {cart.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 rounded-lg bg-card p-2">
                <div className="size-12 shrink-0 overflow-hidden rounded-lg">
                  <NftImage image={{ ...item.nft.image, alt: '' }} sizes="3rem" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{item.nft.name} <span className="font-normal text-muted-foreground">(x {item.quantity})</span></p>
                  <p className="text-micro text-muted-foreground">ID do token: #{item.nft.tokenId} · {item.edition.label}</p>
                </div>
                <p className="font-bold text-primary">{formatEthWithUnit(item.lineTotal)}</p>
              </li>
            ))}
          </ul>
          <p className="text-center text-micro">
            Tem um código promocional? <Link to="/cart" className="text-primary underline underline-offset-4">Aplique aqui</Link>
          </p>
        </section>

        <section aria-label="Valores" className="space-y-2" aria-busy={quote.isFetching}>
          {!quote.data ? (
            <div className="space-y-2" data-testid="summary-skeleton">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-5 rounded-sm" />)}</div>
          ) : (
            <dl className={cn('space-y-1', quote.isPlaceholderData && 'opacity-60')} data-testid="checkout-summary">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatEth(quote.data.subtotal)} ETH</dd></div>
              <div className="flex justify-between"><dt>Desconto do lançamento</dt><dd>(-) {formatEth(quote.data.discount)} ETH</dd></div>
              <div className="flex justify-between">
                <dt>Taxa de rede</dt>
                <dd className="text-right">{formatEth(quote.data.networkFee)} ETH<span className="block text-micro text-primary">Taxa estimada</span></dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-title">
                <dt>Total</dt><dd className="text-primary" data-testid="checkout-total">{formatEth(quote.data.total)} ETH</dd>
              </div>
            </dl>
          )}
          {blocking && (
            <p role="alert" className="text-micro text-warning">
              {quote.data?.issues.map((i) => i.message).join(' ')} <Link to="/cart" className="underline">Ajustar carrinho</Link>
            </p>
          )}
        </section>

        <section aria-labelledby="wallet-network" className="space-y-3">
          <h2 id="wallet-network" className="text-title">Carteira e rede</h2>
          <fieldset className="space-y-2">
            <legend className="sr-only">Tipo de carteira</legend>
            {WALLET_PROVIDERS.map((p) => (
              <label
                key={p}
                className={cn(
                  'flex cursor-pointer items-center justify-between rounded-lg border border-border px-4 py-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                  provider === p && 'border-primary',
                )}
              >
                <span>{PROVIDER_LABEL[p]}</span>
                <input
                  type="radio"
                  value={p}
                  checked={provider === p}
                  onChange={() => { form.setValue('provider', p); resetConnection() }}
                  className="size-4 accent-[hsl(var(--primary))]"
                />
              </label>
            ))}
          </fieldset>
          <WalletConnectionControl wallet={wallet} provider={provider} network={network} state={connection} onChange={setConnection} />
        </section>

        {errors.root?.server?.message && <div role="alert"><FieldError>{errors.root.server.message}</FieldError></div>}
        <Button
          type="submit"
          className="w-full max-md:h-12 max-md:rounded-full max-md:bg-primary-gradient max-md:text-title"
          disabled={!!pendingOrderId || !quote.data || !!blocking}
        >
          Confirmar compra
        </Button>
      </aside>

      {reviewOpen && (
        <OrderReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          seenTotal={quote.data?.total}
          wallet={wallet}
          provider={values.provider}
          network={values.network}
          collector={{
            displayName: values.displayName,
            username: values.username,
            email: values.email,
            profileName: values.profileName,
            referralCode: values.referralCode,
            ensName: `${values.ensLabel}.eth`,
            note: values.note || undefined,
          }}
        />
      )}
    </form>
  )
}

function CheckoutSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando pagamento" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12">
      <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
      <div className="space-y-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>
    </div>
  )
}
