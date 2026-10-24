import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useOpenAuth } from '@/features/auth/auth-dialog-store'
import { useSession } from '@/features/auth/hooks/use-session'
import { cn } from '@/lib/cn'
import type { NftId } from '@/types'
import { useFavorites, useToggleFavorite } from '../hooks/use-favorites'

interface FavoriteButtonProps {
  nftId: NftId
  name: string
  /** overlay: ícone sobre a imagem (cards, mobile) · button: botão "Favoritar" do detalhe desktop. */
  variant: 'overlay' | 'button'
  className?: string
}

/**
 * Botão de alternância (aria-pressed): o nome fica fixo ("Favoritar X") e o estado é anunciado
 * como "pressionado". Visitante é convidado a entrar.
 */
export function FavoriteButton({ nftId, name, variant, className }: FavoriteButtonProps) {
  const { status } = useSession()
  const { ids } = useFavorites()
  const toggle = useToggleFavorite()
  const openAuth = useOpenAuth()
  const active = ids.has(nftId)

  const onClick = () => {
    if (status !== 'authenticated') {
      toast('Entre para salvar seus favoritos.')
      openAuth('login')
      return
    }
    toggle.mutate({ nftId, name, favorite: !active })
  }

  const icon = <Heart className={cn('size-4', active && 'fill-current')} aria-hidden="true" />

  if (variant === 'button') {
    return (
      <Button variant="outline" onClick={onClick} aria-pressed={active} className={cn('text-body', className)}>
        {icon}
        {active ? 'Favoritado' : 'Favoritar'}
        <span className="sr-only"> {name}</span>
      </Button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`Favoritar ${name}`}
      className={cn(
        'flex size-8 items-center justify-center rounded-full border border-primary/70 bg-background/70 text-primary backdrop-blur transition-opacity hover:bg-background',
        // Desktop: aparece no hover/foco do card; se já é favorito, fica sempre visível.
        !active && 'md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100',
        className,
      )}
    >
      {icon}
    </button>
  )
}
