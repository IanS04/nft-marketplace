import type { ReactNode } from 'react'
import { SearchX } from 'lucide-react'
import { cn } from '@/lib/cn'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-lg bg-card p-8 text-center', className)}>
      <SearchX className="size-8 text-muted-foreground" aria-hidden="true" />
      <h2 className="text-title">{title}</h2>
      {description && <p className="max-w-md text-muted-foreground">{description}</p>}
      {action}
    </div>
  )
}
