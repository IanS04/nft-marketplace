import { createFileRoute } from '@tanstack/react-router'
import { LearnPage } from '@/features/learn/components/learn-page'

export const Route = createFileRoute('/learn')({
  head: () => ({ meta: [{ title: 'Aprenda sobre NFTs · Kurio' }] }),
  component: LearnPage,
})
