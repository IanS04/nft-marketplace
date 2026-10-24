import { createFileRoute, redirect } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'
import { AuthPage } from '@/features/auth/components/auth-page'
import { authSearchSchema } from '@/lib/safe-redirect'
import { sessionStore } from '@/services/api/session-store'

export const Route = createFileRoute('/register')({
  validateSearch: zodValidator(authSearchSchema),
  beforeLoad: ({ search }) => {
    if (sessionStore.getSnapshot().status === 'authenticated') throw redirect({ href: search.redirect ?? '/' })
  },
  head: () => ({ meta: [{ title: 'Criar conta · Kurio' }] }),
  component: RegisterPage,
})

function RegisterPage() {
  const { redirect: target } = Route.useSearch()
  return <AuthPage mode="register" redirect={target} />
}
