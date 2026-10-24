import { createFileRoute } from '@tanstack/react-router'
import { OffersPage } from '@/features/account/components/offers-page'

export const Route = createFileRoute('/_auth/profile/offers')({
  head: () => ({ meta: [{ title: 'Ofertas · Kurio' }] }),
  component: OffersPage,
})
