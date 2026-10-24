import { useId } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { isOneOf } from '@/lib/guards'
import { NFT_SORT_KEYS } from '@/schemas/nft'
import { useCatalogSearch } from '../hooks/use-catalog-search'
import { SORT_LABEL } from '../labels'

export function SortSelect() {
  const { search, setFilters } = useCatalogSearch()
  const labelId = useId()

  return (
    <div className="flex items-center gap-1">
      <span id={labelId} className="whitespace-nowrap text-body">Ordenar por:</span>
      <Select
        value={search.sort}
        onValueChange={(value) => {
          if (isOneOf(NFT_SORT_KEYS, value)) void setFilters({ sort: value })
        }}
      >
        <SelectTrigger aria-labelledby={labelId} className="font-bold">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {NFT_SORT_KEYS.map((key) => (
            <SelectItem key={key} value={key}>{SORT_LABEL[key]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
