import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { LogIn, Search, ShoppingCart, X } from 'lucide-react'
import { lazy, Suspense, useRef, useState, type FormEvent } from 'react'
import { Unavailable } from '@/components/feedback/unavailable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useOpenAuth } from '@/features/auth/auth-dialog-store'
import { CartCountBadge } from '@/features/cart/components/cart-count-badge'
import { useSession } from '@/features/auth/hooks/use-session'
import { cn } from '@/lib/cn'
import { Logo } from './logo'

// Menu do usuário (Radix DropdownMenu + floating-ui) só é baixado para quem está logado.
const UserMenu = lazy(() => import('@/features/auth/components/user-menu').then((m) => ({ default: m.UserMenu })))

// "Mercado" agrupa o fluxo de compra (detalhe, carrinho, pagamento), como no Figma.
const MARKET_PATHS = ['/nfts/', '/cart', '/checkout', '/orders/']

const navItemClass =
  'flex h-16 items-center border-b-2 border-transparent px-1 text-body text-foreground transition-colors hover:text-primary'
const activeClass = 'border-primary font-bold text-primary'

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isHome = pathname === '/'
  const isMarket = MARKET_PATHS.some((p) => pathname.startsWith(p))

  return (
    <header className="sticky top-0 z-40 hidden border-b border-primary/30 bg-background/95 backdrop-blur md:block">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-6 px-6">
        <Logo />

        <nav aria-label="Principal">
          <ul className="flex items-center gap-6 lg:gap-10">
            <li>
              <Link to="/" className={cn(navItemClass, isHome && activeClass)} aria-current={isHome ? 'page' : undefined}>
                Início
              </Link>
            </li>
            <li>
              <Link to="/" hash="catalogo" className={cn(navItemClass, isMarket && activeClass)}>
                Mercado
              </Link>
            </li>
            <li className={navItemClass}><Unavailable>Criadores</Unavailable></li>
            <li className={navItemClass}><Unavailable>Aprenda</Unavailable></li>
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <HeaderSearch />
          <Link
            to="/cart"
            className="relative inline-flex size-9 items-center justify-center rounded-md text-foreground hover:bg-secondary"
          >
            <ShoppingCart className="size-5" aria-hidden="true" />
            <CartCountBadge />
          </Link>
          <HeaderAccount />
        </div>
      </div>
    </header>
  )
}

function HeaderAccount() {
  const { status, session } = useSession()
  const openAuth = useOpenAuth()
  if (status === 'authenticated' && session) {
    return (
      <Suspense fallback={<span className="block h-8 w-40" aria-hidden="true" />}>
        <UserMenu user={session.user} />
      </Suspense>
    )
  }
  return (
    <Button size="sm" className="text-body" onClick={() => openAuth('login')}>
      <LogIn aria-hidden="true" />
      Entrar
    </Button>
  )
}

/** Busca do header: uma nova busca começa sem os filtros anteriores. */
function HeaderSearch() {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const navigate = useNavigate()

  const close = () => {
    setOpen(false)
    toggleRef.current?.focus()
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const q = inputRef.current?.value.trim() ?? ''
    void navigate({ to: '/', search: { q: q || undefined }, hash: 'catalogo' })
    setOpen(false)
  }

  if (!open) {
    return (
      <Button ref={toggleRef} variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Abrir busca">
        <Search className="!size-5" aria-hidden="true" />
      </Button>
    )
  }

  return (
    <form role="search" onSubmit={submit} className="flex items-center gap-1">
      <label htmlFor="header-search" className="sr-only">Buscar NFTs</label>
      <Input
        ref={inputRef}
        id="header-search"
        type="search"
        autoFocus
        placeholder="Buscar NFTs…"
        className="h-9 w-56"
        onKeyDown={(e) => e.key === 'Escape' && close()}
      />
      <Button type="submit" variant="ghost" size="icon" aria-label="Buscar">
        <Search aria-hidden="true" />
      </Button>
      <Button variant="ghost" size="icon" onClick={close} aria-label="Fechar busca">
        <X aria-hidden="true" />
      </Button>
    </form>
  )
}
