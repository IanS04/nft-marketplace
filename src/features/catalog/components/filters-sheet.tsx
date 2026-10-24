import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useNftList } from '../hooks/use-nft-list'
import { CatalogFilters } from './catalog-filters'
import { SortSelect } from './sort-select'

interface FiltersSheetProps {
  trigger: ReactNode
  side: 'bottom' | 'right'
  /** No mobile a ordenação também mora no drawer (não cabe na barra de abas). */
  withSort?: boolean
}

/** Drawer de filtros para telas sem a sidebar (< 1024px). */
export function FiltersSheet({ trigger, side, withSort = false }: FiltersSheetProps) {
  const { data } = useNftList()
  const total = data?.pageInfo.total

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side={side}>
        <SheetTitle>Filtros</SheetTitle>
        <SheetDescription>Os resultados são atualizados a cada escolha.</SheetDescription>
        {withSort && <SortSelect />}
        <CatalogFilters />
        <SheetClose asChild>
          <Button className="mt-2 w-full">
            {total === undefined ? 'Ver resultados' : `Ver ${total} resultado${total === 1 ? '' : 's'}`}
          </Button>
        </SheetClose>
      </SheetContent>
    </Sheet>
  )
}
