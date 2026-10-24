import { Check } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/cn'
import { formatEth, fromSteps, toSteps } from '@/lib/money'
import { BLOCKCHAINS } from '@/schemas/common'
import { NFT_CATEGORIES } from '@/schemas/nft'
import type { EthAmount, Facet } from '@/types'
import { useCatalogSearch } from '../hooks/use-catalog-search'
import { useNftList } from '../hooks/use-nft-list'
import { CATEGORY_LABEL, NETWORK_LABEL } from '../labels'

const toggle = <T extends string>(list: readonly T[], value: T): T[] =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

const countOf = <T extends string>(facets: Facet<T>[] | undefined, value: T) =>
  facets?.find((f) => f.value === value)?.count

/** Filtros combináveis. Cada clique atualiza a URL e volta para a página 1. */
export function CatalogFilters() {
  const { search, setFilters, clearFilters, hasActiveFilters } = useCatalogSearch()
  const { data } = useNftList()
  const facets = data?.facets

  return (
    <div className="space-y-6">
      <FilterGroup title="Coleções">
        {NFT_CATEGORIES.map((category) => (
          <FilterOption
            key={category}
            label={CATEGORY_LABEL[category]}
            count={countOf(facets?.categories, category)}
            pressed={search.categories.includes(category)}
            onToggle={() => setFilters({ categories: toggle(search.categories, category) })}
          />
        ))}
      </FilterGroup>

      <PriceRangeFilter range={facets?.priceRange} />

      <FilterGroup title="Rede">
        {BLOCKCHAINS.map((network) => (
          <FilterOption
            key={network}
            label={NETWORK_LABEL[network]}
            count={countOf(facets?.networks, network)}
            pressed={search.networks.includes(network)}
            onToggle={() => setFilters({ networks: toggle(search.networks, network) })}
          />
        ))}
      </FilterGroup>

      {hasActiveFilters && (
        <Button variant="link" className="h-auto px-0" onClick={() => void clearFilters()}>
          Limpar filtros
        </Button>
      )}
    </div>
  )
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h3 id={id} className="text-title">{title}</h3>
      <ul className="space-y-0.5">{children}</ul>
    </section>
  )
}

interface FilterOptionProps {
  label: string
  count: number | undefined
  pressed: boolean
  onToggle: () => void
}

function FilterOption({ label, count, pressed, onToggle }: FilterOptionProps) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={pressed}
        onClick={onToggle}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-body transition-colors hover:bg-secondary',
          pressed ? 'font-bold text-primary' : 'text-foreground',
        )}
      >
        <span className="flex items-center gap-1.5">
          {/* Ícone além da cor: o estado não depende só de cor */}
          {pressed && <Check className="size-3.5" aria-hidden="true" />}
          {label}
        </span>
        {count === undefined ? (
          <Skeleton className="h-3 w-7 rounded-sm" />
        ) : (
          <span className="text-muted-foreground">
            ({count})<span className="sr-only"> NFTs</span>
          </span>
        )}
      </button>
    </li>
  )
}

function PriceRangeFilter({ range }: { range?: { min: EthAmount; max: EthAmount } }) {
  const { search } = useCatalogSearch()
  if (!range) {
    return (
      <FilterGroup title="Faixa de preço">
        <li><Skeleton className="h-16 w-full" /></li>
      </FilterGroup>
    )
  }
  // key: quando a URL muda por fora (voltar/limpar filtros), o slider recomeça do valor da URL.
  return <PriceRangeForm key={`${search.minPrice}-${search.maxPrice}`} range={range} />
}

function PriceRangeForm({ range }: { range: { min: EthAmount; max: EthAmount } }) {
  const { search, setFilters } = useCatalogSearch()
  const lo = toSteps(range.min, '0.01', 'floor')
  const hi = toSteps(range.max, '0.01', 'ceil')
  const clamp = (n: number) => Math.min(hi, Math.max(lo, n))

  const initial: [number, number] = [
    search.minPrice ? clamp(toSteps(search.minPrice)) : lo,
    search.maxPrice ? clamp(toSteps(search.maxPrice, '0.01', 'ceil')) : hi,
  ]
  const [value, setValue] = useState<[number, number]>(initial)
  const changed = value[0] !== initial[0] || value[1] !== initial[1]

  const apply = () =>
    setFilters({
      minPrice: value[0] > lo ? fromSteps(value[0]) : undefined,
      maxPrice: value[1] < hi ? fromSteps(value[1]) : undefined,
    })

  return (
    <FilterGroup title="Faixa de preço">
      <li className="space-y-3 px-1">
        {hi > lo && (
          <Slider
            min={lo}
            max={hi}
            step={1}
            minStepsBetweenThumbs={1}
            value={value}
            onValueChange={(v) => setValue([v[0] ?? lo, v[1] ?? hi])}
            thumbLabels={['Preço mínimo', 'Preço máximo']}
          />
        )}
        <p className="text-body" aria-live="polite">
          Preço: {formatEth(fromSteps(value[0]))} – {formatEth(fromSteps(value[1]))} ETH
        </p>
        <Button size="sm" onClick={() => void apply()} disabled={!changed}>
          Aplicar
        </Button>
      </li>
    </FilterGroup>
  )
}
