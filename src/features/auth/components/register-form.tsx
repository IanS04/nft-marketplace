import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FieldError, PasswordField, TextField } from '@/components/ui/form-field'
import { applyApiErrors } from '@/lib/form-errors'
import { registerSchema } from '@/schemas/auth'
import type { AuthSession } from '@/types'
import { useRegister } from '../api/mutations'
import { inputClass, submitClass, type AuthFormSize } from './form-styles'

interface RegisterFormProps {
  idPrefix: string
  size?: AuthFormSize
  submitLabel?: string
  onSuccess: (session: AuthSession) => void
}

export function RegisterForm({ idPrefix, size = 'compact', submitLabel = 'Criar conta', onSuccess }: RegisterFormProps) {
  const registerAccount = useRegister()
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const session = await registerAccount.mutateAsync(values)
      toast.success('Conta criada!', { description: `Boas-vindas à Kurio, ${session.user.username}.` })
      onSuccess(session)
    } catch (error) {
      // 409: "e-mail já cadastrado" / "usuário em uso" caem no campo certo
      applyApiErrors(error, form.setError, ['username', 'email', 'password'])
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3" aria-label="Criar conta">
      <TextField
        id={`${idPrefix}-username`}
        label="Nome de usuário"
        hideLabel
        autoComplete="username"
        placeholder="Nome de usuário"
        error={errors.username?.message}
        inputClassName={inputClass(size)}
        {...form.register('username')}
      />
      <TextField
        id={`${idPrefix}-email`}
        label="E-mail"
        hideLabel
        type="email"
        autoComplete="email"
        placeholder="Digite seu e-mail"
        error={errors.email?.message}
        inputClassName={inputClass(size)}
        {...form.register('email')}
      />
      <PasswordField
        id={`${idPrefix}-password`}
        label="Senha"
        hideLabel
        autoComplete="new-password"
        placeholder="Senha"
        error={errors.password?.message}
        inputClassName={inputClass(size)}
        {...form.register('password')}
      />
      <PasswordField
        id={`${idPrefix}-confirm`}
        label="Confirmar senha"
        hideLabel
        autoComplete="new-password"
        placeholder="Confirmar senha"
        error={errors.confirmPassword?.message}
        inputClassName={inputClass(size)}
        {...form.register('confirmPassword')}
      />
      <p className="text-micro text-muted-foreground">Senha com 8+ caracteres, maiúscula, minúscula e número.</p>
      {errors.root?.server?.message && (
        <div role="alert">
          <FieldError>{errors.root.server.message}</FieldError>
        </div>
      )}
      <Button type="submit" className={submitClass(size)} disabled={isSubmitting}>
        {isSubmitting ? 'Criando…' : submitLabel}
      </Button>
    </form>
  )
}
