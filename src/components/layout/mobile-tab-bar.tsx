import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { Heart, House, ScanLine, ShoppingCart, UserRound } from 'lucide-react'
import { CartCountBadge } from '@/features/cart/components/cart-count-badge'
import { cn } from '@/lib/cn'

export const MOBILE_SEARCH_ID = 'busca-mobile'

const itemClass = 'flex size-11 items-center justify-center rounded-full text-foreground'

/** Barra inferior do mobile (Figma): início, favoritos, busca central, carrinho e perfil. */
export function MobileTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const navigate = useNavigate()

  // O botão central do Figma abre a busca: vai para o início e foca o campo "Explorar coleções".
  const openSearch = async () => {
    if (pathname !== '/') await navigate({ to: '/' })
    document.getElementById(MOBILE_SEARCH_ID)?.focus()
  }

  const isActive = (path: string) => (path === '/' ? pathname === '/' : pathname.startsWith(path))
  const favoritesActive = isActive('/profile/favorites')
  const profileActive = isActive('/profile') && !favoritesActive

  return (
    <nav
      aria-label="Navegação inferior"
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-2xl bg-card px-6 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 shadow-[0_-8px_24px_rgb(0_0_0/0.4)] md:hidden"
    >
      <ul className="grid grid-cols-5 items-center justify-items-center">
        <li>
          <Link to="/" className={cn(itemClass, isActive('/') && 'text-primary')} aria-current={isActive('/') ? 'page' : undefined}>
            <House className="size-5" aria-hidden="true" /><span className="sr-only">Início</span>
          </Link>
        </li>
        <li>
          <Link to="/profile/favorites" className={cn(itemClass, favoritesActive && 'text-primary')} aria-current={favoritesActive ? 'page' : undefined}>
            <Heart className="size-5" aria-hidden="true" /><span className="sr-only">Lista de interesse</span>
          </Link>
        </li>
        <li>
          <button
            type="button"
            onClick={() => void openSearch()}
            className="-mt-10 flex size-16 items-center justify-center rounded-full bg-primary-gradient text-primary-foreground shadow-lg ring-8 ring-background"
          >
            <ScanLine className="size-6" aria-hidden="true" /><span className="sr-only">Buscar NFTs</span>
          </button>
        </li>
        <li>
          <Link to="/cart" className={cn(itemClass, isActive('/cart') && 'text-primary')}>
            <span className="relative"><ShoppingCart className="size-5" aria-hidden="true" /><CartCountBadge /></span>
          </Link>
        </li>
        <li>
          <Link to="/profile" className={cn(itemClass, profileActive && 'text-primary')} aria-current={profileActive ? 'page' : undefined}>
            <UserRound className="size-5" aria-hidden="true" /><span className="sr-only">Perfil</span>
          </Link>
        </li>
      </ul>
    </nav>
  )
}
