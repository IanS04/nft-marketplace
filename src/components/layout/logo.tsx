import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/cn'

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('text-body font-bold tracking-[0.2em] text-foreground', className)}>
      KURIO<span className="sr-only">: página inicial</span>
    </Link>
  )
}
