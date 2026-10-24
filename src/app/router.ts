import { createRouter } from '@tanstack/react-router'
import { NotFoundPage } from '@/components/feedback/not-found-page'
import { routeTree } from '@/routeTree.gen'
import { queryClient } from './query-client'

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  // O cache é do TanStack Query; o router não guarda dados próprios.
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  defaultNotFoundComponent: NotFoundPage,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
