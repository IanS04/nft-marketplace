import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { nftDetailQueryOptions } from '@/features/nft-detail/api/queries'
import { NftDetail } from '@/features/nft-detail/components/nft-detail'
import { NftDetailSkeleton } from '@/features/nft-detail/components/nft-detail-skeleton'
import { nftIdParamSchema } from '@/schemas/nft'
import { isApiError } from '@/services/api/errors'

export const Route = createFileRoute('/nfts/$nftId')({
  params: {
    parse: ({ nftId }) => ({ nftId: nftIdParamSchema.parse(nftId) }),
    stringify: ({ nftId }) => ({ nftId }),
  },
  // Acesso direto funciona: o loader busca (ou reaproveita do cache) antes de renderizar.
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(nftDetailQueryOptions(params.nftId))
    } catch (error) {
      if (isApiError(error) && error.status === 404) throw notFound()
      throw error
    }
  },
  head: ({ loaderData }) => ({ meta: [{ title: loaderData ? `${loaderData.name} · Kurio` : 'NFT · Kurio' }] }),
  // Skeleton enquanto carrega (só aparece se demorar > 150ms; fica ao menos 300ms para não piscar).
  pendingComponent: NftDetailSkeleton,
  pendingMs: 150,
  pendingMinMs: 300,
  notFoundComponent: NftNotFound,
  errorComponent: NftDetailError,
  component: NftDetailRoute,
})

function NftDetailRoute() {
  const { nftId } = Route.useParams()
  // useSuspenseQuery: os dados já vieram do loader; o cache segue vivo para atualizações (tempo real).
  const { data: nft } = useSuspenseQuery(nftDetailQueryOptions(nftId))
  return <NftDetail key={nft.id} nft={nft} />
}

function NftNotFound() {
  return (
    <Container className="py-16">
      <EmptyState
        title="NFT não encontrado"
        description="Este NFT não existe ou foi removido do mercado."
        action={<Button asChild><Link to="/" hash="catalogo">Explorar o catálogo</Link></Button>}
      />
    </Container>
  )
}

function NftDetailError({ error }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <Container className="py-16">
      <ErrorState title="Não foi possível carregar este NFT" error={error} onRetry={() => void router.invalidate()} />
    </Container>
  )
}
