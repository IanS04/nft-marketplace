import { Link, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, BadgePercent, Download, Heart, LogOut, MapPin, ShoppingCart, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { Unavailable } from '@/components/feedback/unavailable'
import { useLogout } from '@/features/auth/api/mutations'

const itemClass = 'flex items-center gap-3 whitespace-nowrap border-l-4 border-transparent px-4 py-2.5 text-body text-primary hover:bg-secondary'
const activeClass = '!border-primary bg-secondary/60 text-foreground'

/** Sidebar "Meu perfil" (Figma). Itens fora do escopo mantêm o visual, mas ficam indisponíveis. */
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
        <li>
          <Link to="/profile" activeOptions={{ exact: true }} className={itemClass} activeProps={{ className: activeClass }}>
            <UserRound className="size-4" aria-hidden="true" /> Dados do perfil
          </Link>
        </li>
        <li>
          <Link to="/profile/wallets" className={itemClass} activeProps={{ className: activeClass }}>
            <MapPin className="size-4" aria-hidden="true" /> Carteiras
          </Link>
        </li>
        <Soon icon={<ShoppingCart className="size-4" aria-hidden="true" />}>Atividade</Soon>
        <Soon icon={<Heart className="size-4" aria-hidden="true" />}>Lista de interesse</Soon>
        <Soon icon={<BadgePercent className="size-4" aria-hidden="true" />}>Ofertas</Soon>
        <Soon icon={<Download className="size-4" aria-hidden="true" />}>Arquivos baixados</Soon>
        <Soon icon={<AlertTriangle className="size-4" aria-hidden="true" />}>Suporte</Soon>
        <li className="md:mt-1 md:border-t md:border-primary/40">
          <button type="button" onClick={() => void signOut()} disabled={isPending} className={`${itemClass} w-full font-bold`}>
            <LogOut className="size-4" aria-hidden="true" /> Sair
          </button>
        </li>
      </ul>
    </nav>
  )
}

function Soon({ icon, children }: { icon: ReactNode; children: string }) {
  return (
    <li className="max-md:hidden">
      <Unavailable className={itemClass}>{icon}{children}</Unavailable>
    </li>
  )
}
