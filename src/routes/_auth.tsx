import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { sessionQueryOptions } from '@/features/auth/api/queries'
import { isApiError } from '@/services/api/errors'
import { sessionStore } from '@/services/api/session-store'

/**
 * Guard das rotas privadas (checkout, pedidos, perfil, carteiras).
 * - Sem sessão (ou expirada) → /login?redirect=<página pedida>.
 * - Com sessão → revalida no servidor ao navegar: é aqui que a expiração "durante a navegação" é detectada.
 */
export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context, location }) => {
    const toLogin = () => redirect({ to: '/login', search: { redirect: location.href } })
    const { status, session } = sessionStore.getSnapshot()
    if (status !== 'authenticated' || !session) throw toLogin()

    try {
      // staleTime curto: evita repetir a checagem no preload (hover) seguido do clique.
      await context.queryClient.fetchQuery({ ...sessionQueryOptions(session.user.id), staleTime: 5_000 })
    } catch (error) {
      // 401 → o interceptor já marcou a sessão como expirada (o login vem com o e-mail preenchido).
      if (isApiError(error) && error.status === 401) throw toLogin()
      // Rede/5xx: não derruba a sessão; cada página trata as próprias falhas.
    }
  },
  component: Outlet,
})
