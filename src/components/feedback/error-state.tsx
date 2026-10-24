import { AlertTriangle, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { isApiError } from '@/services/api/errors'

interface ErrorStateProps {
  title?: string
  error: unknown
  onRetry?: () => void
  retrying?: boolean
  className?: string
}

export function ErrorState({ title = 'Algo deu errado', error, onRetry, retrying, className }: ErrorStateProps) {
  const message = isApiError(error) ? error.message : 'Não foi possível carregar o conteúdo.'
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-3 rounded-lg bg-card p-8 text-center', className)}>
      <AlertTriangle className="size-8 text-warning" aria-hidden="true" />
      <h2 className="text-title">{title}</h2>
      <p className="max-w-md text-muted-foreground">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} disabled={retrying}>
          <RotateCw className={cn(retrying && 'animate-spin')} aria-hidden="true" />
          {retrying ? 'Tentando…' : 'Tentar novamente'}
        </Button>
      )}
    </div>
  )
}
