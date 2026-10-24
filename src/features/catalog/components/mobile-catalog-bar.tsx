import { Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { MOBILE_SEARCH_ID } from '@/components/layout/mobile-tab-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCatalogSearch } from '../hooks/use-catalog-search'
import { FiltersSheet } from './filters-sheet'

const DEBOUNCE_MS = 400

/** Topo da tela inicial no mobile (Figma): busca "Explorar coleções" + botão de filtros. */
export function MobileCatalogBar() {
  const { search, setFilters } = useCatalogSearch()
  const [value, setValue] = useState(search.q ?? '')
  const committed = useRef(search.q ?? '')

  // A URL mudou por fora (voltar/limpar filtros): o campo acompanha.
  useEffect(() => {
    const q = search.q ?? ''
    if (q !== committed.current) {
      committed.current = q
      setValue(q)
    }
  }, [search.q])

  // Digitação com debounce: só grava na URL quando o usuário para de digitar.
  useEffect(() => {
    const timer = setTimeout(() => {
      const q = value.trim()
      if (q === committed.current) return
      committed.current = q
      void setFilters({ q: q || undefined })
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [value, setFilters])

  return (
    <div className="flex gap-3 md:hidden">
      <form role="search" className="relative flex-1" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor={MOBILE_SEARCH_ID} className="sr-only">Explorar coleções</label>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-foreground" aria-hidden="true" />
        <Input
          id={MOBILE_SEARCH_ID}
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Explorar coleções"
          className="h-12 rounded-xl border-transparent bg-card pl-11 font-bold"
        />
      </form>
      <FiltersSheet
        side="bottom"
        withSort
        trigger={
          <Button size="icon" variant="gradient" className="size-12 rounded-xl" aria-label="Filtros e ordenação">
            <SlidersHorizontal className="!size-5" aria-hidden="true" />
          </Button>
        }
      />
    </div>
  )
}
