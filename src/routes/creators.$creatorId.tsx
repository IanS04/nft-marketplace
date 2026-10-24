import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { creatorDetailQueryOptions } from '@/features/creators/api/queries'
import { CreatorDetail, CreatorDetailSkeleton } from '@/features/creators/components/creator-detail'
import { isApiError } from '@/services/api/errors'

export const Route = createFileRoute('/creators/$creatorId')({
  // Acesso direto funciona: o loader busca (ou reaproveita do cache) antes de renderizar.
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(creatorDetailQueryOptions(params.creatorId))
    } catch (error) {
      if (isApiError(error) && error.status === 404) throw notFound()
      throw error
    }
  },
  head: ({ loaderData }) => ({ meta: [{ title: loaderData ? `${loaderData.name} · Criadores · Kurio` : 'Criador · Kurio' }] }),
  pendingComponent: CreatorDetailSkeleton,
  pendingMs: 150,
  pendingMinMs: 300,
  notFoundComponent: CreatorNotFound,
  errorComponent: CreatorError,
  component: CreatorRoute,
})

function CreatorRoute() {
  const { creatorId } = Route.useParams()
  const { data: creator } = useSuspenseQuery(creatorDetailQueryOptions(creatorId))
  return <CreatorDetail creator={creator} />
}

function CreatorNotFound() {
  return (
    <Container className="py-16">
      <EmptyState
        title="Criador não encontrado"
        description="Este perfil não existe ou foi removido."
        action={<Button asChild><Link to="/creators">Ver todos os criadores</Link></Button>}
      />
    </Container>
  )
}

function CreatorError({ error }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <Container className="py-16">
      <ErrorState title="Não foi possível carregar este criador" error={error} onRetry={() => void router.invalidate()} />
    </Container>
  )
}
