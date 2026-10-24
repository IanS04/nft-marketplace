import { createFileRoute } from '@tanstack/react-router'
import { FavoritesPage } from '@/features/favorites/components/favorites-page'

export const Route = createFileRoute('/_auth/profile/favorites')({
  head: () => ({ meta: [{ title: 'Lista de interesse · Kurio' }] }),
  component: FavoritesPage,
})
