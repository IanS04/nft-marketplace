import { Link, useNavigate, type LinkProps } from '@tanstack/react-router'
import { AlertTriangle, BadgePercent, Download, Heart, LogOut, MapPin, ShoppingCart, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { toast } from '@/lib/toast'
import { useLogout } from '@/features/auth/api/mutations'

const itemClass = 'flex items-center gap-3 whitespace-nowrap border-l-4 border-transparent px-4 py-2.5 text-body text-primary hover:bg-secondary'
const activeClass = '!border-primary bg-secondary/60 text-foreground'

const ITEMS: { to: LinkProps['to']; label: string; icon: ReactNode; exact?: boolean }[] = [
  { to: '/profile', label: 'Dados do perfil', icon: <UserRound className="size-4" aria-hidden="true" />, exact: true },
  { to: '/profile/wallets', label: 'Carteiras', icon: <MapPin className="size-4" aria-hidden="true" /> },
  { to: '/profile/activity', label: 'Atividade', icon: <ShoppingCart className="size-4" aria-hidden="true" /> },
  { to: '/profile/favorites', label: 'Lista de interesse', icon: <Heart className="size-4" aria-hidden="true" /> },
  { to: '/profile/offers', label: 'Ofertas', icon: <BadgePercent className="size-4" aria-hidden="true" /> },
  { to: '/profile/downloads', label: 'Arquivos baixados', icon: <Download className="size-4" aria-hidden="true" /> },
  { to: '/profile/support', label: 'Suporte', icon: <AlertTriangle className="size-4" aria-hidden="true" /> },
]

/** Sidebar "Meu perfil" (Figma). No mobile vira uma faixa de links com rolagem horizontal. */
export function ProfileSidebar() {
  const { logout, isPending } = useLogout()
  const navigate = useNavigate()

  const signOut = async () => {
    await logout()
    toast('Você saiu da sua conta.')
    await navigate({ to: '/' })
  }

  return (
    // min-w-0: como item de grid, sem isso a faixa de links (mobile) estica a página em vez de rolar.
    <nav aria-labelledby="profile-nav-title" className="min-w-0 self-start rounded-lg bg-card py-3">
      <h2 id="profile-nav-title" className="px-4 pb-2 text-title">Meu perfil</h2>
      <ul className="flex overflow-x-auto md:block">
        {ITEMS.map(({ to, label, icon, exact }) => (
          <li key={label}>
            <Link to={to} activeOptions={{ exact }} className={itemClass} activeProps={{ className: activeClass, 'aria-current': 'page' }}>
              {icon} {label}
            </Link>
          </li>
        ))}
        <li className="md:mt-1 md:border-t md:border-primary/40">
          <button type="button" onClick={() => void signOut()} disabled={isPending} className={`${itemClass} w-full font-bold`}>
            <LogOut className="size-4" aria-hidden="true" /> Sair
          </button>
        </li>
      </ul>
    </nav>
  )
}
