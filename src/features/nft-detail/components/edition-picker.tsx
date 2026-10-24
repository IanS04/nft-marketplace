import { useId } from 'react'
import { cn } from '@/lib/cn'
import type { EditionId, NftEdition } from '@/types'

interface EditionPickerProps {
  editions: NftEdition[]
  value: EditionId
  onChange: (id: EditionId) => void
}

/** Edição como grupo de rádios nativos: setas do teclado funcionam e esgotadas ficam desabilitadas. */
export function EditionPicker({ editions, value, onChange }: EditionPickerProps) {
  const name = useId()
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 font-bold">Edição:</legend>
      <div className="flex flex-wrap gap-2">
        {editions.map((edition) => {
          const soldOut = edition.status === 'sold_out'
          const checked = edition.id === value
          return (
            <label
              key={edition.id}
              className={cn(
                'relative rounded-full border px-3 py-1 text-body transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                checked ? 'border-primary font-bold text-primary' : 'border-border text-foreground',
                soldOut ? 'cursor-not-allowed text-muted-foreground line-through opacity-60' : 'cursor-pointer hover:border-primary/60',
              )}
            >
              <input
                type="radio"
                name={name}
                value={edition.id}
                checked={checked}
                disabled={soldOut}
                onChange={() => onChange(edition.id)}
                // Transparente cobrindo a pill: clicável e acessível (sr-only seria "invisível" para clique).
                className="absolute inset-0 size-full cursor-pointer appearance-none rounded-full opacity-0 disabled:cursor-not-allowed"
              />
              {edition.label}
              {soldOut && <span className="sr-only"> (esgotada)</span>}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
