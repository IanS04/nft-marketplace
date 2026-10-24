import { ChevronDown } from 'lucide-react'
import { useId } from 'react'
import { isOneOf } from '@/lib/guards'
import { NFT_SORT_KEYS } from '@/schemas/nft'
import { useCatalogSearch } from '../hooks/use-catalog-search'
import { SORT_LABEL } from '../labels'

/**
 * <select> NATIVO (e não um select customizado): teclado, leitor de tela e a lista do sistema no
 * celular funcionam de graça, e ele não pesa no JavaScript inicial da tela principal.
 */
export function SortSelect() {
  const { search, setFilters } = useCatalogSearch()
  const id = useId()

  return (
    <div className="flex items-center gap-1">
      <label htmlFor={id} className="whitespace-nowrap text-body">Ordenar por:</label>
      <div className="relative">
        <select
          id={id}
          value={search.sort}
          onChange={(event) => {
            if (isOneOf(NFT_SORT_KEYS, event.target.value)) void setFilters({ sort: event.target.value })
          }}
          className="h-9 cursor-pointer appearance-none rounded-sm bg-background py-0 pl-2 pr-7 text-body font-bold text-foreground hover:bg-secondary"
        >
          {NFT_SORT_KEYS.map((key) => (
            <option key={key} value={key}>{SORT_LABEL[key]}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      </div>
    </div>
  )
}
