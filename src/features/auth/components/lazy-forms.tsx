import { lazy, Suspense, type ComponentProps } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

/*
 * Formulários de login/cadastro carregados só quando um diálogo abre: React Hook Form, resolvers
 * e os formulários saem do JavaScript inicial (melhora o carregamento da tela inicial no mobile).
 */
const LoginFormImpl = lazy(() => import('./login-form').then((m) => ({ default: m.LoginForm })))
const RegisterFormImpl = lazy(() => import('./register-form').then((m) => ({ default: m.RegisterForm })))

function FormSkeleton({ fields }: { fields: number }) {
  return (
    <div aria-busy="true" aria-label="Carregando formulário" className="space-y-3">
      {Array.from({ length: fields }, (_, i) => <Skeleton key={i} className="h-10 w-full rounded-sm" />)}
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  )
}

export function LazyLoginForm(props: ComponentProps<typeof LoginFormImpl>) {
  return (
    <Suspense fallback={<FormSkeleton fields={2} />}>
      <LoginFormImpl {...props} />
    </Suspense>
  )
}

export function LazyRegisterForm(props: ComponentProps<typeof RegisterFormImpl>) {
  return (
    <Suspense fallback={<FormSkeleton fields={4} />}>
      <RegisterFormImpl {...props} />
    </Suspense>
  )
}
