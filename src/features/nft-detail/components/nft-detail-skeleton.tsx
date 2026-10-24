import { Container } from '@/components/layout/container'
import { Skeleton } from '@/components/ui/skeleton'

/** Mesmo esqueleto do detalhe (galeria + informações): nada pula quando os dados chegam. */
export function NftDetailSkeleton() {
  return (
    <Container className="space-y-6 px-0 pb-10 md:px-6 md:py-8" aria-busy="true" aria-label="Carregando NFT">
      <Skeleton className="hidden h-5 w-40 md:block" />
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid gap-4 md:grid-cols-[4.5rem_minmax(0,1fr)]">
          <div className="hidden flex-col gap-3 md:flex">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="aspect-square w-full" />)}
          </div>
          <Skeleton className="aspect-square w-full rounded-none md:rounded-xl" />
        </div>
        <div className="space-y-4 px-4 md:px-0">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </Container>
  )
}
