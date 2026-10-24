import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/cn'

interface QuantityStepperProps {
  value: number
  max: number
  min?: number
  onChange: (value: number) => void
  /** Nome acessível do grupo, ex.: "Quantidade de Emerald Ape #042". */
  label: string
  disabled?: boolean
  size?: 'sm' | 'lg'
  className?: string
}

/** Quantidade sempre inteira, entre `min` e `max`. Os botões desabilitam nos limites. */
export function QuantityStepper({ value, max, min = 1, onChange, label, disabled, size = 'sm', className }: QuantityStepperProps) {
  const button = cn(
    'flex items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:bg-primary-hover disabled:opacity-40',
    size === 'lg' ? 'size-9' : 'size-6',
  )
  return (
    <div role="group" aria-label={label} className={cn('flex items-center gap-3', className)}>
      <button
        type="button"
        className={button}
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= min}
        aria-label="Diminuir quantidade"
      >
        <Minus className="size-3.5" aria-hidden="true" />
      </button>
      <output aria-live="polite" className={cn('min-w-[1.5ch] text-center font-bold', size === 'lg' ? 'text-title' : 'text-body')}>
        {value}
      </output>
      <button
        type="button"
        className={button}
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label="Aumentar quantidade"
      >
        <Plus className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}
