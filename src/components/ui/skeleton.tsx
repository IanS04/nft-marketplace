import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

/**
 * Bloco com shimmer (classe .skeleton em styles/index.css, respeita prefers-reduced-motion).
 * Dê ao skeleton as MESMAS dimensões do conteúdo final para não haver layout shift.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" data-testid="skeleton" className={cn('skeleton', className)} {...props} />
}
