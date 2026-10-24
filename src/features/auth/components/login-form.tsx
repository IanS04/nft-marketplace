import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Unavailable } from '@/components/feedback/unavailable'
import { Button } from '@/components/ui/button'
import { FieldError, PasswordField, TextField } from '@/components/ui/form-field'
import { applyApiErrors } from '@/lib/form-errors'
import { loginSchema } from '@/schemas/auth'
import type { AuthSession } from '@/types'
import { useLogin } from '../api/mutations'
import { inputClass, submitClass, type AuthFormSize } from './form-styles'

interface LoginFormProps {
  /** Prefixo dos ids: o mesmo formulário aparece no modal, na página e na reautenticação. */
  idPrefix: string
  size?: AuthFormSize
  defaultEmail?: string
  onSuccess: (session: AuthSession) => void
}

export function LoginForm({ idPrefix, size = 'compact', defaultEmail = '', onSuccess }: LoginFormProps) {
  const login = useLogin()
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: defaultEmail, password: '' },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const session = await login.mutateAsync(values)
      toast.success(`Olá, ${session.user.displayName}!`, { description: 'Você entrou na sua conta.' })
      onSuccess(session)
    } catch (error) {
      applyApiErrors(error, form.setError, ['email', 'password'])
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3" aria-label="Entrar">
      <TextField
        id={`${idPrefix}-email`}
        label="E-mail"
        hideLabel
        type="email"
        autoComplete="email"
        placeholder="contato@email.com"
        error={errors.email?.message}
        inputClassName={inputClass(size)}
        {...form.register('email')}
      />
      <PasswordField
        id={`${idPrefix}-password`}
        label="Senha"
        hideLabel
        autoComplete="current-password"
        placeholder="Senha"
        error={errors.password?.message}
        inputClassName={inputClass(size)}
        {...form.register('password')}
      />
      <div className="text-right">
        <Unavailable className="text-micro text-primary">Esqueceu a senha?</Unavailable>
      </div>
      {errors.root?.server?.message && (
        <div role="alert">
          <FieldError>{errors.root.server.message}</FieldError>
        </div>
      )}
      <Button type="submit" className={submitClass(size)} disabled={isSubmitting}>
        {isSubmitting ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}
