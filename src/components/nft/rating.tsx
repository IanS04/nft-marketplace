import { Star } from 'lucide-react'
import { cn } from '@/lib/cn'

const formatAverage = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** Estrelas + contagem. As avaliações em si estão fora do escopo: só a nota é exibida. */
export function Rating({ average, count, compact = false, className }: { average: number; count: number; compact?: boolean; className?: string }) {
  if (compact) {
    return (
      <span className={cn('inline-flex items-center gap-1 rounded-full border border-primary px-2 py-0.5 text-body', className)}>
        <Star className="size-3.5 fill-primary text-primary" aria-hidden="true" />
        <span className="sr-only">Nota </span>
        {formatAverage(average)}
        <span className="text-muted-foreground">({count}<span className="sr-only"> avaliações</span>)</span>
      </span>
    )
  }
  return (
    <span className={cn('inline-flex items-center gap-2 text-body', className)}>
      <span className="flex" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} className={cn('size-3.5 text-primary', i < Math.round(average) && 'fill-primary')} />
        ))}
      </span>
      <span className="sr-only">Nota {formatAverage(average)} de 5.</span>
      {count} avaliações de colecionadores
    </span>
  )
}
