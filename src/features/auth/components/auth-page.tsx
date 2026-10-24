import { Link, useRouter } from '@tanstack/react-router'
import { cn } from '@/lib/cn'
import type { AuthMode } from '../auth-dialog-store'
import { useSession } from '../hooks/use-session'
import { AUTH_INTRO } from '../copy'
import { LoginForm } from './login-form'
import { RegisterForm } from './register-form'
import { SocialLogin } from './social-login'

interface AuthPageProps {
  mode: AuthMode
  /** Para onde voltar depois de entrar (já validado: só caminhos internos). */
  redirect?: string
}

/**
 * /login e /register: página cheia no mobile (Figma) e cartão centralizado no desktop
 * (acesso direto ou redirecionamento do guard de rotas privadas).
 */
export function AuthPage({ mode, redirect }: AuthPageProps) {
  const router = useRouter()
  const { status, session } = useSession()
  const expired = status === 'expired' && mode === 'login'
  const goBack = () => router.history.push(redirect ?? '/')

  const title = mode === 'login' ? 'Entrar' : 'Criar perfil de colecionador'
  const tabClass = (active: boolean) =>
    cn(active ? 'text-primary underline underline-offset-8' : 'text-foreground hover:text-primary')

  return (
    <div className="mx-auto w-full max-w-md space-y-5 px-6 pb-10 pt-6 md:my-12 md:max-w-sm md:rounded-t-lg md:border-b-4 md:border-primary md:bg-card-elevated md:p-6 md:shadow-2xl">
      <Link to="/" className="mb-16 mt-10 block text-center text-heading tracking-[0.2em] md:hidden">
        KURIO<span className="sr-only">: página inicial</span>
      </Link>

      <h1 className="text-center text-title md:sr-only">{title}</h1>
      <nav aria-label="Entrar ou criar conta" className="hidden items-center justify-center gap-2 text-title md:flex">
        <Link to="/login" search={{ redirect }} className={tabClass(mode === 'login')} aria-current={mode === 'login' ? 'page' : undefined}>
          Entrar
        </Link>
        <span aria-hidden="true">|</span>
        <Link to="/register" search={{ redirect }} className={tabClass(mode === 'register')} aria-current={mode === 'register' ? 'page' : undefined}>
          Criar conta
        </Link>
      </nav>
      <p className="hidden text-center text-micro md:block">{AUTH_INTRO[mode]}</p>

      {expired && (
        <p role="status" className="rounded-sm border border-warning/60 bg-warning/10 px-3 py-2 text-micro text-foreground">
          Sua sessão expirou. Entre novamente para continuar de onde parou.
        </p>
      )}

      {mode === 'login' ? (
        <LoginForm idPrefix="page" size="responsive" defaultEmail={expired ? session?.user.email : undefined} onSuccess={goBack} />
      ) : (
        <RegisterForm idPrefix="page" size="responsive" submitLabel="Criar perfil" onSuccess={goBack} />
      )}

      <SocialLogin large />

      <p className="pt-4 text-center text-body text-primary md:hidden">
        {mode === 'login' ? (
          <>Novo na Kurio? <Link to="/register" search={{ redirect }} className="underline underline-offset-4">Crie uma conta</Link></>
        ) : (
          <>Já tem uma conta? <Link to="/login" search={{ redirect }} className="underline underline-offset-4">Entre</Link></>
        )}
      </p>
    </div>
  )
}
