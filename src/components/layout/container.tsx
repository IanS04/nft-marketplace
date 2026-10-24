import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

/** Largura útil do desktop (1200px) com respiro lateral no mobile. */
export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mx-auto w-full max-w-content px-4 md:px-6', className)} {...props} />
}
