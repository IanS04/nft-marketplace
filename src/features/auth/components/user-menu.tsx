import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronDown, LogOut, UserRound, Wallet } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { User } from '@/types'
import { useLogout } from '../api/mutations'

export function UserAvatar({ user, className = 'size-7' }: { user: User; className?: string }) {
  if (user.avatarUrl) return <img src={user.avatarUrl} alt="" className={`${className} rounded-full object-cover`} />
  return (
    <span aria-hidden="true" className={`${className} flex items-center justify-center rounded-full bg-primary text-micro font-bold text-primary-foreground`}>
      {user.displayName.charAt(0).toUpperCase()}
    </span>
  )
}

export function UserMenu({ user }: { user: User }) {
  const { logout, isPending } = useLogout()
  const navigate = useNavigate()

  const signOut = async () => {
    await logout()
    toast('Você saiu da sua conta.')
    await navigate({ to: '/' })
  }

  return (
    // O nome acessível vem do texto visível ("Conta de" só para leitores de tela): rótulo e texto não divergem.
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-body">
          <UserAvatar user={user} />
          <span className="sr-only">Conta de </span>
          <span className="max-w-[9rem] truncate" data-testid="user-name">{user.displayName}</span>
          <ChevronDown className="text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link to="/profile"><UserRound aria-hidden="true" /> Meu perfil</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/profile/wallets"><Wallet aria-hidden="true" /> Carteiras</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isPending} onSelect={() => void signOut()}>
          <LogOut aria-hidden="true" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
