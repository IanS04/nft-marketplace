import { createFileRoute, redirect } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'
import { AuthPage } from '@/features/auth/components/auth-page'
import { authSearchSchema } from '@/lib/safe-redirect'
import { sessionStore } from '@/services/api/session-store'

export const Route = createFileRoute('/login')({
  validateSearch: zodValidator(authSearchSchema),
  // Já autenticado? Não há o que fazer aqui: segue para o destino.
  beforeLoad: ({ search }) => {
    if (sessionStore.getSnapshot().status === 'authenticated') throw redirect({ href: search.redirect ?? '/' })
  },
  head: () => ({ meta: [{ title: 'Entrar · Kurio' }] }),
  component: LoginPage,
})

function LoginPage() {
  const { redirect: target } = Route.useSearch()
  return <AuthPage mode="login" redirect={target} />
}
