import { cn } from '@/lib/cn'

/** Avatar com as iniciais: os criadores são fictícios, então não usamos fotos de pessoas reais. */
export function CreatorAvatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span
      aria-hidden="true"
      className={cn('flex size-12 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground', className)}
    >
      {initials}
    </span>
  )
}
